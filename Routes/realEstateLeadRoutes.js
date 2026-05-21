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

  const getLeadUserFromHeaders = async (req) => {
    if (!req.headers["x-lead-user-id"] && !req.headers["x-lead-user-token"]) {
      return { user: null };
    }
    return verifyLeadUserRequest(req);
  };

  // Helper: format date to DD-MM-YYYY
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  // Statuses that unlock property fields
  const INTERESTED_STATUSES = ["Follow-up", "Interested"];

  // ===========================
  // POST /api/realestate-leads
  // ===========================
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
        // Universal Property requirements (from root body)
        propertyType,
        budget,
        preferredArea,
        residentialSize,
        residentialCategory,
        commercialType,
        calls = [],
        // Optional: track which lead user submitted this
        submittedBy,
        submittedByUsername,
      } = req.body;

      if (!customerName?.trim()) return res.status(400).json({ success: false, message: "Customer name is required" });
      if (!customerNumber) return res.status(400).json({ success: false, message: "Customer number is required" });
      if (!/^\d{10}$/.test(customerNumber)) return res.status(400).json({ success: false, message: "Customer number must be exactly 10 digits" });
      if (!source?.trim()) return res.status(400).json({ success: false, message: "Source is required" });
      if (!leadDate) return res.status(400).json({ success: false, message: "Lead date is required" });
      if (!Array.isArray(calls) || calls.length === 0) return res.status(400).json({ success: false, message: "At least one call record is required" });

      // Validate calls (now purely for interaction history)
      for (let i = 0; i < calls.length; i++) {
        const c = calls[i];
        if (!c.callingDate) return res.status(400).json({ success: false, message: `Call ${i + 1}: Calling date is required` });
        if (!c.manager?.trim()) return res.status(400).json({ success: false, message: `Call ${i + 1}: Manager is required` });
        if (!c.status?.trim()) return res.status(400).json({ success: false, message: `Call ${i + 1}: Status is required` });
      }

      const auth = await getLeadUserFromHeaders(req);
      if (auth.errorStatus) {
        return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
      }
      if (!auth.user && (submittedBy || submittedByUsername)) {
        return res.status(401).json({ success: false, message: "Lead user authentication is required." });
      }

      const normalizedLeadType = leadType?.trim() || "realestate";
      if (auth.user && !getUserModules(auth.user).includes(normalizedLeadType)) {
        return res.status(403).json({ success: false, message: "You do not have access to this lead module." });
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
        // Universal requirements
        propertyType: propertyType?.trim() || "",
        budget: budget?.trim() || "",
        preferredArea: preferredArea?.trim() || "",
        residentialSize: residentialSize?.trim() || "",
        residentialCategory: residentialCategory?.trim() || "",
        commercialType: commercialType?.trim() || "",
        // Call history — if submitted by a lead user with assignedManager, override manager on all calls
        calls: calls.map((c) => ({
          callingDate: new Date(c.callingDate),
          manager: (auth.user?.assignedManager) ? auth.user.assignedManager : (c.manager?.trim() || ""),
          status: c.status,
          remarks: c.remarks?.trim() || "",
          followUpDate: c.followUpDate ? new Date(c.followUpDate) : null,
        })),
        // Track submitter
        submittedBy: auth.user ? auth.user._id : (submittedBy || null),
        submittedByUsername: auth.user ? auth.user.username : (submittedByUsername?.trim() || ""),
      });

      await lead.save();
      return res.status(201).json({ success: true, message: "Lead saved successfully", data: lead });
    } catch (err) {
      console.error("❌ RealEstate Lead Create Error:", err);
      if (err.name === "ValidationError") return res.status(400).json({ success: false, message: err.message });
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ===========================
  // GET /api/realestate-leads
  // ===========================
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
      console.error("❌ RealEstate Lead Fetch Error:", err);
      return res.status(500).json({ success: false, message: "Fetch failed" });
    }
  });

  // ===========================
  // PUT /api/realestate-leads/:id
  // ===========================
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
        calls = []
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

      // Validate calls
      if (!Array.isArray(calls) || calls.length === 0) {
        return res.status(400).json({ success: false, message: "At least one call record is required" });
      }

      for (let i = 0; i < calls.length; i++) {
        const c = calls[i];
        if (!c.callingDate) return res.status(400).json({ success: false, message: `Call ${i + 1}: Calling date is required` });
        // If lead user has assignedManager, manager field is optional from frontend (will be overridden)
        if (!auth.user?.assignedManager && !c.manager?.trim()) return res.status(400).json({ success: false, message: `Call ${i + 1}: Manager is required` });
        if (!c.status?.trim()) return res.status(400).json({ success: false, message: `Call ${i + 1}: Status is required` });
      }

      // Update only editable fields
      lead.propertyType = propertyType?.trim() || "";
      lead.budget = budget?.trim() || "";
      lead.preferredArea = preferredArea?.trim() || "";
      lead.residentialSize = residentialSize?.trim() || "";
      lead.residentialCategory = residentialCategory?.trim() || "";
      lead.commercialType = commercialType?.trim() || "";
      lead.financeProduct = financeProduct?.trim() || "";
      lead.loanAmount = loanAmount?.trim() || "";
      lead.passedOn = passedOn?.trim() || "";
      // Override manager with assignedManager if lead user is authenticated
      lead.calls = calls.map((c) => ({
        callingDate: new Date(c.callingDate),
        manager: (auth.user?.assignedManager) ? auth.user.assignedManager : (c.manager?.trim() || ""),
        status: c.status,
        remarks: c.remarks?.trim() || "",
        followUpDate: c.followUpDate ? new Date(c.followUpDate) : null,
      }));

      await lead.save();
      return res.json({ success: true, message: "Lead updated successfully", data: lead });
    } catch (err) {
      console.error("❌ RealEstate Lead Update Error:", err);
      if (err.name === "ValidationError") return res.status(400).json({ success: false, message: err.message });
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ===========================
  // POST /api/realestate-leads/verify-password
  // ===========================
  router.post("/verify-password", (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: "Password required" });
    if (password === process.env.DOWNLOAD_PASSWORD) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: "Incorrect password" });
  });

  // ===========================
  // Helper: build and send Excel for a given leadType filter
  // ===========================
  const buildAndSendExcel = async (res, leads, leadTypeLabel) => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = leadTypeLabel === "finance" ? "Finance Leads" : "Real Estate Leads";
    const fileName = leadTypeLabel === "finance" ? "finance-leads.xlsx" : "realestate-leads.xlsx";
    const sheet = workbook.addWorksheet(sheetName);

    // Columns differ slightly by type
    const isFinance = leadTypeLabel === "finance";

    sheet.columns = [
      { header: "Lead Type",            key: "leadType",           width: 16 },
      { header: "Lead Date",            key: "leadDate",           width: 15 },
      { header: "Customer Name",        key: "customerName",       width: 25 },
      { header: "Customer Number",      key: "customerNumber",     width: 18 },
      { header: "Source",               key: "source",             width: 22 },
      ...(!isFinance ? [
        { header: "Project Name",       key: "projectName",        width: 25 },
        { header: "Property Type",      key: "propertyType",       width: 18 },
        { header: "Budget",             key: "budget",             width: 15 },
        { header: "Preferred Area",     key: "preferredArea",      width: 20 },
        { header: "Residential Size",   key: "residentialSize",    width: 18 },
        { header: "Residential Category", key: "residentialCategory", width: 22 },
        { header: "Commercial Type",    key: "commercialType",     width: 18 },
      ] : [
        { header: "Finance Product",    key: "financeProduct",     width: 22 },
        { header: "Loan Amount",        key: "loanAmount",         width: 18 },
      ]),
      { header: "Reference Of",         key: "referenceOf",        width: 20 },
      { header: "Passed On",            key: "passedOn",           width: 22 },
      { header: "Submitted By",         key: "submittedByUsername", width: 20 },
      { header: "Call #",               key: "callNo",             width: 8  },
      { header: "Calling Date",         key: "callingDate",        width: 15 },
      { header: "Manager",              key: "manager",            width: 22 },
      { header: "Status",               key: "status",             width: 20 },
      { header: "Follow Up Date",       key: "followUpDate",       width: 15 },
      { header: "Remarks",              key: "remarks",            width: 30 },
      { header: "Lead Created At",      key: "createdAt",          width: 22 },
    ];

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isFinance ? "C5E0B4" : "BDD7EE" }, // green for finance, blue for realestate
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Flatten: one row per call
    leads.forEach((lead) => {
      const isFinanceLead = lead.leadType === "finance";
      const baseRow = {
        leadType:            lead.leadType || "realestate",
        leadDate:            formatDate(lead.leadDate),
        customerName:        lead.customerName,
        customerNumber:      lead.customerNumber,
        source:              lead.source,
        projectName:         lead.projectName || "",
        referenceOf:         lead.referenceOf || "",
        loanAmount:          lead.loanAmount || "",
        propertyType:        lead.propertyType || "",
        budget:              lead.budget || "",
        preferredArea:       lead.preferredArea || "",
        residentialSize:     lead.residentialSize || "",
        residentialCategory: lead.residentialCategory || "",
        commercialType:      lead.commercialType || "",
        financeProduct:      lead.financeProduct || "",
        passedOn:            lead.passedOn || "",
        submittedByUsername: lead.submittedByUsername || "",
        createdAt:           formatDate(lead.createdAt),
      };

      if (!lead.calls || lead.calls.length === 0) {
        const row = sheet.addRow({ ...baseRow, callNo: "—", callingDate: "", manager: "", status: "", followUpDate: "", remarks: "" });
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      } else {
        lead.calls.forEach((c, idx) => {
          const row = sheet.addRow({
            ...(idx === 0 ? baseRow : {
              leadType: "", leadDate: "", customerName: "", customerNumber: "",
              source: "", projectName: "", referenceOf: "", loanAmount: "",
              propertyType: "", budget: "", preferredArea: "", residentialSize: "",
              residentialCategory: "", commercialType: "", financeProduct: "",
              passedOn: "", submittedByUsername: "", createdAt: "",
            }),
            callNo:      idx + 1,
            callingDate: formatDate(c.callingDate),
            manager:     c.manager || "",
            status:      c.status || "",
            followUpDate: c.followUpDate ? formatDate(c.followUpDate) : "—",
            remarks:     c.remarks || "",
          });
          row.eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          });
        });
      }
    });

    // NO sheet protection — file is fully editable
    const filePath = path.join(__dirname, "..", fileName);
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, fileName, (err) => {
      if (err) console.error("❌ Excel download error:", err);
      try { fs.unlinkSync(filePath); } catch (_) {}
    });
  };

  // ===========================
  // GET /api/realestate-leads/export/realestate  — Real Estate leads only
  // ===========================
  router.get("/export/realestate", async (req, res) => {
    try {
      // Verify download password
      const pwd = req.query.password;
      if (!pwd || pwd !== process.env.DOWNLOAD_PASSWORD) {
        return res.status(401).json({ success: false, message: "Incorrect password. Export denied." });
      }

      // Check lead user permission if authenticated
      const auth = await getLeadUserFromHeaders(req);
      if (auth.errorStatus) {
        return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
      }
      if (auth.user && !auth.user.rolePermissions?.canDownloadExcel) {
        return res.status(403).json({ success: false, message: "You do not have permission to download Excel." });
      }

      const leads = await RealEstateLead.find({ leadType: "realestate" }).sort({ createdAt: -1 });
      await buildAndSendExcel(res, leads, "realestate");
    } catch (err) {
      console.error("❌ RealEstate Export Error:", err);
      return res.status(500).json({ success: false, message: "Export failed" });
    }
  });

  // ===========================
  // GET /api/realestate-leads/export/finance  — Finance leads only
  // ===========================
  router.get("/export/finance", async (req, res) => {
    try {
      // Verify download password
      const pwd = req.query.password;
      if (!pwd || pwd !== process.env.DOWNLOAD_PASSWORD) {
        return res.status(401).json({ success: false, message: "Incorrect password. Export denied." });
      }

      // Check lead user permission if authenticated
      const auth = await getLeadUserFromHeaders(req);
      if (auth.errorStatus) {
        return res.status(auth.errorStatus).json({ success: false, message: auth.errorMessage });
      }
      if (auth.user && !auth.user.rolePermissions?.canDownloadExcel) {
        return res.status(403).json({ success: false, message: "You do not have permission to download Excel." });
      }

      const leads = await RealEstateLead.find({ leadType: "finance" }).sort({ createdAt: -1 });
      await buildAndSendExcel(res, leads, "finance");
    } catch (err) {
      console.error("❌ Finance Export Error:", err);
      return res.status(500).json({ success: false, message: "Export failed" });
    }
  });

  // ===========================
  // GET /api/realestate-leads/export  (legacy — kept for backward compatibility)
  // ===========================
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
      const leads = await RealEstateLead.find(query).sort({ createdAt: -1 });
      await buildAndSendExcel(res, leads, "all");
    } catch (err) {
      console.error("❌ RealEstate Lead Export Error:", err);
      return res.status(500).json({ success: false, message: "Export failed" });
    }
  });

  export default router;
