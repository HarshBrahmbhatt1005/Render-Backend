import express from "express";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import RealEstateLead from "../models/RealEstateLead.js";
import {
  buildLeadQueryForUser,
  getUserModules,
  verifyLeadUserRequest,
} from "../utils/leadPermissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const SCHEDULE_VISIT_STATUS = "Schedule Visit";

const getLeadUserFromHeaders = async (req) => {
  if (!req.headers["x-lead-user-id"] && !req.headers["x-lead-user-token"]) {
    return { user: null };
  }
  return verifyLeadUserRequest(req);
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const getSubmittedByDisplayName = (lead) => {
  const submittedByUser = lead.submittedBy && typeof lead.submittedBy === "object"
    ? lead.submittedBy
    : null;

  return (
    lead.submittedByDisplayName ||
    submittedByUser?.displayName ||
    submittedByUser?.assignedManager ||
    submittedByUser?.username ||
    lead.submittedByUsername ||
    lead.calls?.[0]?.callerName ||
    lead.calls?.[0]?.manager ||
    ""
  );
};

const normalizeCall = (call, assignedManager = "", leadType = "realestate") => ({
  callingDate: new Date(call.callingDate),
  callerName: assignedManager || call.callerName?.trim() || call.manager?.trim() || "",
  status: call.status,
  remarks: call.remarks?.trim() || "",
  followUpDate: call.followUpDate ? new Date(call.followUpDate) : null,
  visitDate:
    leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS && call.visitDate
      ? new Date(call.visitDate)
      : null,
  visitRemark:
    leadType === "realestate" && call.status === SCHEDULE_VISIT_STATUS
      ? call.visitRemark?.trim() || ""
      : "",
});

const validateCalls = (calls, leadType, assignedManager = "") => {
  if (!Array.isArray(calls) || calls.length === 0) {
    return "At least one call record is required";
  }

  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    if (!c.callingDate) return `Call ${i + 1}: Calling date is required`;
    if (!assignedManager && !(c.callerName?.trim() || c.manager?.trim())) return `Call ${i + 1}: Caller name is required`;
    if (!c.status?.trim()) return `Call ${i + 1}: Status is required`;
    if (leadType === "realestate" && c.status === SCHEDULE_VISIT_STATUS) {
      if (!c.visitDate) return `Call ${i + 1}: Visit date is required`;
      if (!c.visitRemark?.trim()) return `Call ${i + 1}: Visit remark is required`;
    }
  }

  return null;
};

const normalizePassword = (value) => String(value || "").trim();

const requireAdminPassword = (req, res) => {
  const configuredPassword = normalizePassword(process.env.LEAD_ADMIN_PASSWORD);
  if (!configuredPassword) {
    return { errorStatus: 500, errorMessage: "Lead admin password is not configured." };
  }

  const adminPassword = normalizePassword(req.headers["x-admin-password"]);
  if (!adminPassword || adminPassword !== configuredPassword) {
    return { errorStatus: 401, errorMessage: "Incorrect admin password." };
  }

  return { ok: true };
};

const requireTemplateAccess = (req, res) => {
  const adminAuth = requireAdminPassword(req, res);
  if (!adminAuth.errorStatus) {
    return { ok: true };
  }

  const downloadPassword = normalizePassword(req.query.password);
  if (downloadPassword && downloadPassword === normalizePassword(process.env.DOWNLOAD_PASSWORD)) {
    return { ok: true };
  }

  return { errorStatus: 401, errorMessage: "Incorrect password. Template download denied." };
};

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^\w]/g, "");

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const excelEpoch = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(excelEpoch.getTime()) ? null : excelEpoch;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  const parts = raw.split(/[-/.]/).map((part) => part.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const candidates = [
      new Date(`${c}-${b}-${a}`),
      new Date(`${c}-${a}-${b}`),
      new Date(`${a}-${b}-${c}`),
    ];
    const parsed = candidates.find((d) => !Number.isNaN(d.getTime()));
    if (parsed) return parsed;
  }

  return null;
};

const parseTextValue = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeLeadTypeValue = (value) => {
  const raw = parseTextValue(value).toLowerCase();
  if (!raw) return "realestate";
  if (raw === "finance") return "finance";
  if (raw === "real estate" || raw === "realestate") return "realestate";
  return raw.replace(/\s+/g, "");
};

const getDateKey = (date) => {
  const parsed = parseDateValue(date);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const buildLeadDuplicateQuery = (lead) => {
  const dateKey = getDateKey(lead.leadDate);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  return {
    customerNumber: lead.customerNumber,
    customerName: lead.customerName,
    source: lead.source,
    projectName: lead.projectName || "",
    referenceOf: lead.referenceOf || "",
    leadType: lead.leadType || "realestate",
    leadDate: { $gte: dayStart, $lte: dayEnd },
  };
};

const getCall1FromRowMap = (rowMap) => ({
  callingDate: rowMap["calls.0.callingDate"] || rowMap.callingDate || "",
  callerName: rowMap["calls.0.callerName"] || rowMap.callerName || rowMap.manager || rowMap.assignedManager || "",
  status: rowMap["calls.0.status"] || rowMap.status || "",
  remarks: rowMap["calls.0.remarks"] || rowMap.remarks || "",
  followUpDate: rowMap["calls.0.followUpDate"] || rowMap.followUpDate || "",
  visitDate: rowMap["calls.0.visitDate"] || rowMap.visitDate || "",
  visitRemark: rowMap["calls.0.visitRemark"] || rowMap.visitRemark || "",
});

const buildRowLeadFromMap = (rowMap) => {
  const leadType = normalizeLeadTypeValue(rowMap.leadType);
  const customerName = parseTextValue(rowMap.customerName);
  const customerNumber = parseTextValue(rowMap.customerNumber).replace(/\D/g, "");
  const source = parseTextValue(rowMap.source);
  const leadDate = parseDateValue(rowMap.leadDate);
  const assignedManager = parseTextValue(rowMap.assignedManager || rowMap.callerName || rowMap.manager || rowMap.assignedTo);
  const call1 = getCall1FromRowMap(rowMap);
  const importedStatus = parseTextValue(call1.status);
  const importedRemarks = parseTextValue(call1.remarks) || "Imported from Excel";

  const baseLead = {
    leadDate,
    customerName,
    customerNumber,
    source,
    projectName: parseTextValue(rowMap.projectName),
    referenceOf: parseTextValue(rowMap.referenceOf),
    leadType,
    financeProduct: parseTextValue(rowMap.financeProduct),
    loanAmount: parseTextValue(rowMap.loanAmount),
    passedOn: parseTextValue(rowMap.passedOn),
    propertyType: parseTextValue(rowMap.propertyType),
    budget: parseTextValue(rowMap.budget),
    preferredArea: parseTextValue(rowMap.preferredArea),
    residentialSize: parseTextValue(rowMap.residentialSize),
    residentialCategory: parseTextValue(rowMap.residentialCategory),
    commercialType: parseTextValue(rowMap.commercialType),
    assignedManager,
    calls: [
      {
        callingDate: parseDateValue(call1.callingDate) || leadDate || new Date(),
        callerName: parseTextValue(call1.callerName) || assignedManager || "Bulk Upload",
        status: importedStatus || "Bulk Upload",
        remarks: importedRemarks,
        followUpDate: parseDateValue(call1.followUpDate),
        visitDate: parseDateValue(call1.visitDate),
        visitRemark: parseTextValue(call1.visitRemark),
      },
    ],
  };

  return baseLead;
};

const HEADER_ALIASES = {
  customername: "customerName",
  customer: "customerName",
  customername1: "customerName",
  customernumber: "customerNumber",
  mobilenumber: "customerNumber",
  mobile: "customerNumber",
  source: "source",
  leaddate: "leadDate",
  date: "leadDate",
  projectname: "projectName",
  project: "projectName",
  referenceof: "referenceOf",
  reference: "referenceOf",
  leadtype: "leadType",
  financeproduct: "financeProduct",
  loanamount: "loanAmount",
  passedon: "passedOn",
  propertytype: "propertyType",
  budget: "budget",
  preferredarea: "preferredArea",
  residentialsize: "residentialSize",
  residentialcategory: "residentialCategory",
  commercialtype: "commercialType",
  callername: "callerName",
  manager: "callerName",
  assignedto: "callerName",
  assignedmanager: "assignedManager",
  status: "status",
  remarks: "remarks",
  call0callingdate: "calls.0.callingDate",
  call0callername: "calls.0.callerName",
  call0status: "calls.0.status",
  call0remarks: "calls.0.remarks",
  call0followupdate: "calls.0.followUpDate",
  call0visitdate: "calls.0.visitDate",
  call0visitremark: "calls.0.visitRemark",
};

const mapRowToLeadFields = (rowValues, headerIndexMap) => {
  const rowMap = {};
  Object.entries(headerIndexMap).forEach(([field, index]) => {
    rowMap[field] = rowValues[index + 1];
  });
  return buildRowLeadFromMap(rowMap);
};

const getTemplateColumns = (templateType) => {
  const isFinance = templateType === "finance";
  return [
    { header: "leadDate", key: "leadDate", width: 14 },
    { header: "customerName", key: "customerName", width: 24 },
    { header: "customerNumber", key: "customerNumber", width: 16 },
    { header: "source", key: "source", width: 20 },
    { header: "assignedManager", key: "assignedManager", width: 20 },
    { header: "leadType", key: "leadType", width: 14 },
    ...(isFinance
      ? [
          { header: "financeProduct", key: "financeProduct", width: 22 },
          { header: "loanAmount", key: "loanAmount", width: 16 },
          { header: "passedOn", key: "passedOn", width: 16 },
        ]
      : [
          { header: "projectName", key: "projectName", width: 22 },
          { header: "referenceOf", key: "referenceOf", width: 18 },
          { header: "propertyType", key: "propertyType", width: 18 },
          { header: "budget", key: "budget", width: 16 },
          { header: "preferredArea", key: "preferredArea", width: 18 },
          { header: "residentialSize", key: "residentialSize", width: 18 },
          { header: "residentialCategory", key: "residentialCategory", width: 20 },
          { header: "commercialType", key: "commercialType", width: 18 },
        ]),
    ...(isFinance
      ? [
          { header: "calls.0.callingDate", key: "callCallingDate", width: 18 },
          { header: "calls.0.callerName", key: "callCallerName", width: 20 },
          { header: "calls.0.status", key: "callStatus", width: 18 },
          { header: "calls.0.followUpDate", key: "callFollowUpDate", width: 18 },
          { header: "calls.0.remarks", key: "callRemarks", width: 24 },
        ]
      : [
          { header: "calls.0.callingDate", key: "callCallingDate", width: 18 },
          { header: "calls.0.callerName", key: "callCallerName", width: 20 },
          { header: "calls.0.status", key: "callStatus", width: 18 },
          { header: "calls.0.followUpDate", key: "callFollowUpDate", width: 18 },
          { header: "calls.0.visitDate", key: "callVisitDate", width: 18 },
          { header: "calls.0.visitRemark", key: "callVisitRemark", width: 24 },
          { header: "calls.0.remarks", key: "callRemarks", width: 24 },
        ]),
  ];
};

const buildTemplateWorkbook = (templateType) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(templateType === "finance" ? "Finance Leads" : "Real Estate Leads");
  sheet.columns = getTemplateColumns(templateType);
  sheet.addRow({});
  sheet.spliceRows(2, 1);
  return workbook;
};

router.post("/", async (req, res) => {
  try {
    const {
      leadDate,
      customerName,
      customerNumber,
      source,
      projectName,
      referenceOf,
      leadType,
      financeProduct,
      loanAmount,
      passedOn,
      assignedManager,
      propertyType,
      budget,
      preferredArea,
      residentialSize,
      residentialCategory,
      commercialType,
      calls = [],
      submittedBy,
      submittedByUsername,
      submittedByDisplayName,
    } = req.body;

    if (!customerName?.trim()) return res.status(400).json({ success: false, message: "Customer name is required" });
    if (!customerNumber) return res.status(400).json({ success: false, message: "Customer number is required" });
    if (!/^\d{10}$/.test(customerNumber)) return res.status(400).json({ success: false, message: "Customer number must be exactly 10 digits" });
    if (!source?.trim()) return res.status(400).json({ success: false, message: "Source is required" });
    if (!leadDate) return res.status(400).json({ success: false, message: "Lead date is required" });

    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }
    if (!auth.user && (submittedBy || submittedByUsername || submittedByDisplayName)) {
      return res.status(401).json({ success: false, message: "Lead user authentication is required." });
    }

    const normalizedLeadType = leadType?.trim() || "realestate";
    if (auth.user && !getUserModules(auth.user).includes(normalizedLeadType)) {
      return res.status(403).json({ success: false, message: "You do not have access to this lead module." });
    }

    const callError = validateCalls(calls, normalizedLeadType, auth.user?.assignedManager || "");
    if (callError) {
      return res.status(400).json({ success: false, message: callError });
    }

    const lead = new RealEstateLead({
      leadDate: new Date(leadDate),
      customerName: customerName.trim(),
      customerNumber,
      source: source.trim(),
      projectName: projectName?.trim() || "",
      referenceOf: referenceOf?.trim() || "",
      leadType: normalizedLeadType,
      financeProduct: financeProduct?.trim() || "",
      loanAmount: loanAmount?.trim() || "",
      passedOn: passedOn?.trim() || "",
      propertyType: propertyType?.trim() || "",
      budget: budget?.trim() || "",
      preferredArea: preferredArea?.trim() || "",
      residentialSize: residentialSize?.trim() || "",
      residentialCategory: residentialCategory?.trim() || "",
      commercialType: commercialType?.trim() || "",
      assignedManager: assignedManager?.trim() || "",
      calls: calls.map((c) => normalizeCall(c, auth.user?.assignedManager || "", normalizedLeadType)),
      submittedBy: auth.user ? auth.user._id : (submittedBy || null),
      submittedByUsername: auth.user ? auth.user.username : (submittedByUsername?.trim() || ""),
      submittedByDisplayName: auth.user ? (auth.user.displayName || auth.user.username) : (submittedByDisplayName?.trim() || ""),
    });

    await lead.save();
    return res.status(201).json({ success: true, message: "Lead saved successfully", data: lead });
  } catch (err) {
    console.error("RealEstate Lead Create Error:", err);
    if (err.name === "ValidationError") return res.status(400).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/import", async (req, res) => {
  try {
    const adminAuth = requireAdminPassword(req, res);
    if (adminAuth.errorStatus) {
      return res.status(adminAuth.errorStatus).json({ success: false, message: adminAuth.errorMessage });
    }

    const { fileData, fileName } = req.body || {};

    if (!fileData) {
      return res.status(400).json({ success: false, message: "Excel file data is required." });
    }

    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(fileData, "base64");
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return res.status(400).json({ success: false, message: "The workbook does not contain any worksheets." });
    }

    const headerRow = sheet.getRow(1);
    const headerIndexMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const normalized = normalizeHeader(cell.value?.text || cell.value || "");
      const mappedField = HEADER_ALIASES[normalized];
      if (mappedField && headerIndexMap[mappedField] === undefined) {
        headerIndexMap[mappedField] = colNumber - 1;
      }
    });

    const requiredFields = ["customerName", "customerNumber", "source", "leadDate"];
    const missingRequiredHeaders = requiredFields.filter((field) => headerIndexMap[field] === undefined);
    if (missingRequiredHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingRequiredHeaders.join(", ")}`,
      });
    }

    const normalizedFileName = String(fileName || "").toLowerCase();
    const templateType = normalizedFileName.includes("finance") ? "finance" : normalizedFileName.includes("realestate") || normalizedFileName.includes("real-estate") ? "realestate" : "";
    if (templateType && headerIndexMap.leadType === undefined) {
      headerIndexMap.leadType = -1;
    }

    const summary = {
      fileName: fileName || "",
      totalRows: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      if (row.actualCellCount === 0) continue;

      summary.totalRows += 1;
      const rowValues = row.values || [];
      const leadData = mapRowToLeadFields(rowValues, headerIndexMap);
      const rowErrors = [];

      if (!leadData.customerName) rowErrors.push("Customer name is required");
      if (!leadData.customerNumber) rowErrors.push("Customer number is required");
      if (!/^\d{10}$/.test(leadData.customerNumber)) rowErrors.push("Customer number must be exactly 10 digits");
      if (!leadData.source) rowErrors.push("Source is required");
      if (!leadData.leadDate) rowErrors.push("Lead date is required or invalid");

      if (rowErrors.length > 0) {
        summary.failed += 1;
        summary.errors.push({ row: rowNumber, message: rowErrors.join("; ") });
        continue;
      }

      const duplicateQuery = buildLeadDuplicateQuery(leadData);
      const existingLead = duplicateQuery ? await RealEstateLead.findOne(duplicateQuery) : null;
      if (existingLead) {
        summary.skipped += 1;
        summary.errors.push({ row: rowNumber, message: "Duplicate lead skipped" });
        continue;
      }

      const lead = new RealEstateLead({
        ...leadData,
        leadDate: leadData.leadDate,
        submittedBy: null,
        submittedByUsername: "",
        submittedByDisplayName: "",
      });

      await lead.save();
      summary.inserted += 1;
    }

    return res.status(201).json({
      success: true,
      message: "Excel import completed.",
      summary,
    });
  } catch (err) {
    console.error("RealEstate Lead Import Error:", err);
    return res.status(500).json({ success: false, message: "Import failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }

    const query = auth.user ? buildLeadQueryForUser(auth.user) : {};
    const leads = await RealEstateLead.find(query).sort({ createdAt: -1 });
    return res.json(leads);
  } catch (err) {
    console.error("RealEstate Lead Fetch Error:", err);
    return res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      propertyType,
      budget,
      preferredArea,
      residentialSize,
      residentialCategory,
      commercialType,
      financeProduct,
      loanAmount,
      passedOn,
      assignedManager,
      calls = [],
    } = req.body;

    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }

    const leadQuery = auth.user ? { _id: id, ...buildLeadQueryForUser(auth.user) } : { _id: id };
    const lead = await RealEstateLead.findOne(leadQuery);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const currentLeadType = lead.leadType || "realestate";
    const callError = validateCalls(calls, currentLeadType, auth.user?.assignedManager || "");
    if (callError) {
      return res.status(400).json({ success: false, message: callError });
    }

    lead.propertyType = propertyType?.trim() || "";
    lead.budget = budget?.trim() || "";
    lead.preferredArea = preferredArea?.trim() || "";
    lead.residentialSize = residentialSize?.trim() || "";
    lead.residentialCategory = residentialCategory?.trim() || "";
    lead.commercialType = commercialType?.trim() || "";
    lead.financeProduct = financeProduct?.trim() || "";
    lead.loanAmount = loanAmount?.trim() || "";
    lead.passedOn = passedOn?.trim() || "";
    lead.assignedManager = assignedManager?.trim() || lead.assignedManager || "";
    lead.calls = calls.map((c) => normalizeCall(c, auth.user?.assignedManager || "", currentLeadType));

    await lead.save();
    return res.json({ success: true, message: "Lead updated successfully", data: lead });
  } catch (err) {
    console.error("RealEstate Lead Update Error:", err);
    if (err.name === "ValidationError") return res.status(400).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/verify-password", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: "Password required" });
  if (password === process.env.DOWNLOAD_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: "Incorrect password" });
});

const sendTemplateWorkbook = async (res, templateType) => {
  const workbook = buildTemplateWorkbook(templateType);
  const fileName = templateType === "finance" ? "finance-leads-template.xlsx" : "real-estate-leads-template.xlsx";
  const filePath = path.join(__dirname, "..", fileName);
  await workbook.xlsx.writeFile(filePath);
  res.download(filePath, fileName, (err) => {
    if (err) console.error("Template download error:", err);
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  });
};

router.get("/template/realestate", async (req, res) => {
  try {
    const access = requireTemplateAccess(req, res);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
    }
    await sendTemplateWorkbook(res, "realestate");
  } catch (err) {
    console.error("Real Estate template error:", err);
    return res.status(500).json({ success: false, message: "Template generation failed" });
  }
});

router.get("/template/finance", async (req, res) => {
  try {
    const access = requireTemplateAccess(req, res);
    if (access.errorStatus) {
      return res.status(access.errorStatus).json({ success: false, message: access.errorMessage });
    }
    await sendTemplateWorkbook(res, "finance");
  } catch (err) {
    console.error("Finance template error:", err);
    return res.status(500).json({ success: false, message: "Template generation failed" });
  }
});

const buildAndSendExcel = async (res, leads, leadTypeLabel) => {
  const workbook = new ExcelJS.Workbook();
  const sheetName = leadTypeLabel === "finance" ? "Finance Leads" : "Real Estate Leads";
  const fileName = leadTypeLabel === "finance" ? "finance-leads.xlsx" : "realestate-leads.xlsx";
  const sheet = workbook.addWorksheet(sheetName);

  const isFinance = leadTypeLabel === "finance";
  const callHeaders = [
    { header: "calls.0.callingDate", key: "callingDate", width: 18 },
    { header: "calls.0.callerName", key: "callerName", width: 22 },
    { header: "calls.0.status", key: "status", width: 20 },
    { header: "calls.0.followUpDate", key: "followUpDate", width: 18 },
    { header: "calls.0.visitDate", key: "visitDate", width: 18 },
    { header: "calls.0.visitRemark", key: "visitRemark", width: 30 },
    { header: "calls.0.remarks", key: "remarks", width: 30 },
  ];

  sheet.columns = [
    { header: "Sr.no", key: "serialNo", width: 8 },
    { header: "Lead Type", key: "leadType", width: 16 },
    { header: "Lead Date", key: "leadDate", width: 15 },
    { header: "Customer Name", key: "customerName", width: 25 },
    { header: "Customer Number", key: "customerNumber", width: 18 },
    { header: "Source", key: "source", width: 22 },
    { header: "Assigned Manager", key: "assignedManager", width: 22 },
    ...(!isFinance
      ? [
          { header: "Project Name", key: "projectName", width: 25 },
          { header: "Property Type", key: "propertyType", width: 18 },
          { header: "Budget", key: "budget", width: 15 },
          { header: "Preferred Area", key: "preferredArea", width: 20 },
          { header: "Residential Size", key: "residentialSize", width: 18 },
          { header: "Residential Category", key: "residentialCategory", width: 22 },
          { header: "Commercial Type", key: "commercialType", width: 18 },
        ]
      : [
          { header: "Finance Product", key: "financeProduct", width: 22 },
          { header: "Loan Amount", key: "loanAmount", width: 18 },
        ]),
    { header: "Reference Of", key: "referenceOf", width: 20 },
    { header: "Passed On", key: "passedOn", width: 22 },
    { header: "Submitted By Name", key: "submittedByDisplayName", width: 24 },
    ...callHeaders,
    { header: "Lead Created At", key: "createdAt", width: 22 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "000000" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isFinance ? "C5E0B4" : "BDD7EE" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });

  leads.forEach((lead, leadIndex) => {
    const baseRow = {
      serialNo: leadIndex + 1,
      leadType: lead.leadType || "realestate",
      leadDate: formatDate(lead.leadDate),
      customerName: lead.customerName,
      customerNumber: lead.customerNumber,
      source: lead.source,
      projectName: lead.projectName || "",
      referenceOf: lead.referenceOf || "",
      loanAmount: lead.loanAmount || "",
      propertyType: lead.propertyType || "",
      budget: lead.budget || "",
      preferredArea: lead.preferredArea || "",
      residentialSize: lead.residentialSize || "",
      residentialCategory: lead.residentialCategory || "",
      commercialType: lead.commercialType || "",
      financeProduct: lead.financeProduct || "",
      passedOn: lead.passedOn || "",
      assignedManager: lead.assignedManager || "",
      submittedByDisplayName: getSubmittedByDisplayName(lead),
      createdAt: formatDate(lead.createdAt),
    };

    if (!lead.calls || lead.calls.length === 0) {
      const row = sheet.addRow({
        ...baseRow,
        callingDate: "",
        callerName: "",
        status: "",
        followUpDate: "",
        visitDate: "",
        visitRemark: "",
        remarks: "",
      });
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
      return;
    }

    lead.calls.forEach((c, idx) => {
      const row = sheet.addRow({
        ...(idx === 0
          ? baseRow
          : {
              serialNo: "",
              leadType: "",
              leadDate: "",
              customerName: "",
              customerNumber: "",
              source: "",
              projectName: "",
              referenceOf: "",
              loanAmount: "",
              propertyType: "",
              budget: "",
              preferredArea: "",
              residentialSize: "",
              residentialCategory: "",
              commercialType: "",
              financeProduct: "",
              passedOn: "",
              assignedManager: "",
              submittedByDisplayName: "",
              createdAt: "",
            }),
        callingDate: formatDate(c.callingDate),
        callerName: c.callerName || c.manager || "",
        status: c.status || "",
        followUpDate: c.followUpDate ? formatDate(c.followUpDate) : "-",
        visitDate: c.visitDate ? formatDate(c.visitDate) : "-",
        visitRemark: c.visitRemark || "",
        remarks: c.remarks || "",
      });
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });
  });

  const filePath = path.join(__dirname, "..", fileName);
  await workbook.xlsx.writeFile(filePath);
  res.download(filePath, fileName, (err) => {
    if (err) console.error("Excel download error:", err);
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  });
};

router.get("/export/realestate", async (req, res) => {
  try {
    const pwd = req.query.password;
    if (!pwd || pwd !== process.env.DOWNLOAD_PASSWORD) {
      return res.status(401).json({ success: false, message: "Incorrect password. Export denied." });
    }

    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }
    if (auth.user && !auth.user.rolePermissions?.canDownloadExcel) {
      return res.status(403).json({ success: false, message: "You do not have permission to download Excel." });
    }

    const leads = await RealEstateLead.find({ leadType: "realestate" })
      .populate("submittedBy", "displayName username assignedManager")
      .sort({ createdAt: -1 });
    await buildAndSendExcel(res, leads, "realestate");
  } catch (err) {
    console.error("RealEstate Export Error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

router.get("/export/finance", async (req, res) => {
  try {
    const pwd = req.query.password;
    if (!pwd || pwd !== process.env.DOWNLOAD_PASSWORD) {
      return res.status(401).json({ success: false, message: "Incorrect password. Export denied." });
    }

    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }
    if (auth.user && !auth.user.rolePermissions?.canDownloadExcel) {
      return res.status(403).json({ success: false, message: "You do not have permission to download Excel." });
    }

    const leads = await RealEstateLead.find({ leadType: "finance" })
      .populate("submittedBy", "displayName username assignedManager")
      .sort({ createdAt: -1 });
    await buildAndSendExcel(res, leads, "finance");
  } catch (err) {
    console.error("Finance Export Error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

router.get("/export", async (req, res) => {
  try {
    const auth = await getLeadUserFromHeaders(req);
    if (auth.errorStatus) {
      return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
    }
    if (auth.user && !auth.user.rolePermissions?.canDownloadExcel) {
      return res.status(403).json({ success: false, message: "You do not have permission to download Excel." });
    }

    const query = auth.user ? buildLeadQueryForUser(auth.user) : {};
    const leads = await RealEstateLead.find(query)
      .populate("submittedBy", "displayName username assignedManager")
      .sort({ createdAt: -1 });
    await buildAndSendExcel(res, leads, "all");
  } catch (err) {
    console.error("RealEstate Lead Export Error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

export default router;
