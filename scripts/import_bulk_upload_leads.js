import dotenv from "dotenv";
import ExcelJS from "exceljs";
import mongoose from "mongoose";
import RealEstateLead from "../models/RealEstateLead.js";
import LeadUser from "../models/LeadUser.js";

dotenv.config();

const FILE_PATH = process.argv[2] || "Bulk Upload.xlsx";
const DEFAULT_STATUS = "New Lead";

const normalize = (value) => String(value ?? "").trim();

const normalizeLeadType = (value) => {
  const normalized = normalize(value).toLowerCase().replace(/[\s_-]+/g, "");
  if (["realestate", "realestatelead", "re"].includes(normalized)) return "realestate";
  if (["finance", "financelead", "fin"].includes(normalized)) return "finance";
  return "";
};

const getCellText = (row, col) => normalize(row.getCell(col).text || row.getCell(col).value);

const getDateValue = (cell) => {
  if (cell.value instanceof Date) return cell.value;
  if (!cell.value) return null;
  const date = new Date(cell.value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildUserLookup = async () => {
  const users = await LeadUser.find({}).select("_id username displayName assignedManager");
  const lookup = new Map();

  users.forEach((user) => {
    [user.displayName, user.assignedManager, user.username]
      .map(normalize)
      .filter(Boolean)
      .forEach((name) => lookup.set(name.toLowerCase(), user));
  });

  return lookup;
};

const main = async () => {
  const mongoUri = process.env.MONGO_URI || "";
  if (!mongoUri || mongoUri.includes("username:password")) {
    throw new Error("MONGO_URI is missing or still contains placeholder username:password.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);
  const worksheet = workbook.worksheets[0];

  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, col) => {
    headerMap[normalize(cell.value).toLowerCase()] = col;
  });

  const requiredHeaders = [
    "lead type",
    "lead date",
    "customer name",
    "customer number",
    "source",
    "submitted by name",
  ];
  const missingHeaders = requiredHeaders.filter((header) => !headerMap[header]);
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  const validRows = [];
  const skippedInvalid = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const leadType = normalizeLeadType(getCellText(row, headerMap["lead type"]));
    const leadDate = getDateValue(row.getCell(headerMap["lead date"]));
    const customerName = getCellText(row, headerMap["customer name"]);
    const customerNumber = getCellText(row, headerMap["customer number"]).replace(/\D/g, "");
    const source = getCellText(row, headerMap.source);
    const referenceOf = headerMap["reference of"] ? getCellText(row, headerMap["reference of"]) : "";
    const submittedByDisplayName = getCellText(row, headerMap["submitted by name"]);

    const reasons = [];
    if (!leadType) reasons.push("missing/invalid Lead Type");
    if (!leadDate) reasons.push("missing/invalid Lead Date");
    if (!customerName) reasons.push("missing Customer Name");
    if (!/^\d{10}$/.test(customerNumber)) reasons.push("missing/invalid Customer Number");
    if (!source) reasons.push("missing Source");
    if (!submittedByDisplayName) reasons.push("missing Submitted By Name");

    if (reasons.length > 0) {
      skippedInvalid.push({ row: rowNumber, reasons });
      continue;
    }

    validRows.push({
      row: rowNumber,
      leadDate,
      customerName,
      customerNumber,
      source,
      referenceOf,
      leadType,
      submittedByDisplayName,
    });
  }

  await mongoose.connect(mongoUri);

  const userLookup = await buildUserLookup();
  const existingLeads = await RealEstateLead.find({
    customerNumber: { $in: validRows.map((row) => row.customerNumber) },
    leadType: { $in: ["realestate", "finance"] },
  }).select("customerNumber leadType");
  const existingKeys = new Set(
    existingLeads.map((lead) => `${lead.customerNumber}|${lead.leadType || "realestate"}`)
  );

  const skippedDuplicates = [];
  const documents = [];

  validRows.forEach((row) => {
    const duplicateKey = `${row.customerNumber}|${row.leadType}`;
    if (existingKeys.has(duplicateKey)) {
      skippedDuplicates.push({
        row: row.row,
        customerNumber: row.customerNumber,
        leadType: row.leadType,
      });
      return;
    }

    existingKeys.add(duplicateKey);
    const submitter = userLookup.get(row.submittedByDisplayName.toLowerCase());

    documents.push({
      leadDate: row.leadDate,
      customerName: row.customerName,
      customerNumber: row.customerNumber,
      source: row.source,
      projectName: "",
      referenceOf: row.referenceOf,
      leadType: row.leadType,
      financeProduct: "",
      loanAmount: "",
      passedOn: "",
      propertyType: "",
      budget: "",
      preferredArea: "",
      residentialSize: "",
      residentialCategory: "",
      commercialType: "",
      calls: [
        {
          callingDate: row.leadDate,
          callerName: row.submittedByDisplayName,
          status: DEFAULT_STATUS,
          remarks: "",
          followUpDate: null,
          visitDate: null,
          visitRemark: "",
        },
      ],
      submittedBy: submitter?._id || null,
      submittedByUsername: submitter?.username || "",
      submittedByDisplayName: row.submittedByDisplayName,
    });
  });

  const inserted = documents.length > 0
    ? await RealEstateLead.insertMany(documents, { ordered: false })
    : [];

  console.log(JSON.stringify({
    file: FILE_PATH,
    sheet: worksheet.name,
    totalRows: Math.max(worksheet.rowCount - 1, 0),
    validRows: validRows.length,
    inserted: inserted.length,
    skippedInvalid,
    skippedDuplicates,
  }, null, 2));

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
