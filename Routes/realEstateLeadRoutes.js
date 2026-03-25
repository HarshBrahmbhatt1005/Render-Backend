import express from "express";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import RealEstateLead from "../models/RealEstateLead.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Helper: format date to DD-MM-YYYY
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// Statuses that unlock property fields
const INTERESTED_STATUSES = ["Call Connected", "Interested"];

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
      referenceOf,
      // Universal Property requirements (from root body)
      propertyType,
      budget,
      preferredArea,
      residentialSize,
      residentialCategory,
      commercialType,
      calls = []
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

    const lead = new RealEstateLead({
      leadDate: new Date(leadDate),
      customerName: customerName.trim(),
      customerNumber,
      source: source.trim(),
      referenceOf: referenceOf?.trim() || "",
      // Universal requirements
      propertyType: propertyType?.trim() || "",
      budget: budget?.trim() || "",
      preferredArea: preferredArea?.trim() || "",
      residentialSize: residentialSize?.trim() || "",
      residentialCategory: residentialCategory?.trim() || "",
      commercialType: commercialType?.trim() || "",
      // Call history
      calls: calls.map((c) => ({
        callingDate: new Date(c.callingDate),
        manager: c.manager?.trim() || "",
        status: c.status,
        remarks: c.remarks?.trim() || "",
      })),
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
    const leads = await RealEstateLead.find().sort({ createdAt: -1 });
    return res.json(leads);
  } catch (err) {
    console.error("❌ RealEstate Lead Fetch Error:", err);
    return res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

// ===========================
// GET /api/realestate-leads/export
// ===========================
router.get("/export", async (req, res) => {
  try {
    const leads = await RealEstateLead.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Realestate Leads");

    sheet.columns = [
      { header: "Lead Date",           key: "leadDate",           width: 15 },
      { header: "Customer Name",       key: "customerName",       width: 25 },
      { header: "Customer Number",     key: "customerNumber",     width: 18 },
      { header: "Source",              key: "source",             width: 22 },
      { header: "Reference Of",        key: "referenceOf",        width: 20 },
      // Universal Requirements
      { header: "Property Type",       key: "propertyType",       width: 18 },
      { header: "Budget",              key: "budget",             width: 15 },
      { header: "Preferred Area",      key: "preferredArea",      width: 20 },
      { header: "Residential Size",    key: "residentialSize",    width: 18 },
      { header: "Residential Category",key: "residentialCategory",width: 22 },
      { header: "Commercial Type",     key: "commercialType",     width: 18 },
      // Interaction History
      { header: "Call #",              key: "callNo",             width: 8  },
      { header: "Calling Date",        key: "callingDate",        width: 15 },
      { header: "Manager",             key: "manager",            width: 22 },
      { header: "Status",              key: "status",             width: 20 },
      { header: "Remarks",             key: "remarks",            width: 30 },
      { header: "Lead Created At",     key: "createdAt",          width: 22 },
    ];

    // Style header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Flatten: one row per call
    leads.forEach((lead) => {
      if (!lead.calls || lead.calls.length === 0) {
        // Lead with no calls
        const row = sheet.addRow({
          leadDate:            formatDate(lead.leadDate),
          customerName:        lead.customerName,
          customerNumber:      lead.customerNumber,
          source:              lead.source,
          referenceOf:         lead.referenceOf,
          propertyType:        lead.propertyType,
          budget:              lead.budget,
          preferredArea:       lead.preferredArea,
          residentialSize:     lead.residentialSize,
          residentialCategory: lead.residentialCategory,
          commercialType:      lead.commercialType,
          callNo:              "—",
          callingDate:         "",
          manager:             "",
          status:              "",
          remarks:             "",
          createdAt:           formatDate(lead.createdAt),
        });
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });
      } else {
        lead.calls.forEach((c, idx) => {
          const row = sheet.addRow({
            leadDate:            idx === 0 ? formatDate(lead.leadDate) : "",
            customerName:        idx === 0 ? lead.customerName : "",
            customerNumber:      idx === 0 ? lead.customerNumber : "",
            source:              idx === 0 ? lead.source : "",
            referenceOf:         idx === 0 ? lead.referenceOf : "",
            propertyType:        idx === 0 ? lead.propertyType : "",
            budget:              idx === 0 ? lead.budget : "",
            preferredArea:       idx === 0 ? lead.preferredArea : "",
            residentialSize:     idx === 0 ? lead.residentialSize : "",
            residentialCategory: idx === 0 ? lead.residentialCategory : "",
            commercialType:      idx === 0 ? lead.commercialType : "",
            callNo:              idx + 1,
            callingDate:         formatDate(c.callingDate),
            manager:             c.manager,
            status:              c.status,
            remarks:             c.remarks,
            createdAt:           idx === 0 ? formatDate(lead.createdAt) : "",
          });
          row.eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          });
        });
      }
    });

    const filePath = path.join(__dirname, "..", "realestate-leads.xlsx");
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, "realestate-leads.xlsx", (err) => {
      if (err) console.error("❌ Excel download error:", err);
      try { fs.unlinkSync(filePath); } catch (_) {}
    });
  } catch (err) {
    console.error("❌ RealEstate Lead Export Error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

export default router;
