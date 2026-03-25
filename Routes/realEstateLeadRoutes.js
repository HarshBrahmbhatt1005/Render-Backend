import express from "express";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import RealEstateLead from "../models/RealEstateLead.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Helper: format date to Indian format DD-MM-YYYY
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// ===========================
// POST /api/realestate-leads
// ===========================
router.post("/", async (req, res) => {
  try {
    const {
      callingDate,
      source,
      customerName,
      customerNumber,
      propertyType,
      budget,
      area,
      status,
    } = req.body;

    // Validate required fields
    if (!callingDate || !source || !customerName || !customerNumber || !propertyType || !budget || !area || !status) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate customer number
    if (!/^\d{10}$/.test(customerNumber)) {
      return res.status(400).json({ success: false, message: "Customer number must be exactly 10 digits" });
    }

    const lead = new RealEstateLead({
      callingDate: new Date(callingDate),
      source,
      customerName,
      customerNumber,
      propertyType,
      budget,
      area,
      status,
    });

    await lead.save();
    return res.status(201).json({ success: true, message: "Lead saved successfully", data: lead });
  } catch (err) {
    console.error("❌ RealEstate Lead Create Error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
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

    // Define columns
    sheet.columns = [
      { header: "Calling Date",     key: "callingDate",     width: 18 },
      { header: "Source",           key: "source",          width: 20 },
      { header: "Customer Name",    key: "customerName",    width: 25 },
      { header: "Customer Number",  key: "customerNumber",  width: 18 },
      { header: "Property Type",    key: "propertyType",    width: 22 },
      { header: "Budget",           key: "budget",          width: 15 },
      { header: "Area",             key: "area",            width: 20 },
      { header: "Status",           key: "status",          width: 15 },
      { header: "Created At",       key: "createdAt",       width: 22 },
    ];

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    });

    // Add data rows
    leads.forEach((lead) => {
      const row = sheet.addRow({
        callingDate:    formatDate(lead.callingDate),
        source:         lead.source,
        customerName:   lead.customerName,
        customerNumber: lead.customerNumber,
        propertyType:   lead.propertyType,
        budget:         lead.budget,
        area:           lead.area,
        status:         lead.status,
        createdAt:      formatDate(lead.createdAt),
      });

      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" },
        };
      });
    });

    const filePath = path.join(__dirname, "..", "realestate-leads.xlsx");
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "realestate-leads.xlsx", (err) => {
      if (err) console.error("❌ Excel download error:", err);
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ RealEstate Lead Export Error:", err);
    return res.status(500).json({ success: false, message: "Export failed" });
  }
});

export default router;
