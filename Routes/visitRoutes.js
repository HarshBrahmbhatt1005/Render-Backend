import express from "express";
import Visit from "../models/Visit.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// ===========================
// 🔹 CREATE (POST)
// ===========================
router.post("/", async (req, res) => {
  try {
    const newVisit = new Visit(req.body);
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("❌ Visit Save Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===========================
// 🔹 FETCH ALL (GET)
// ===========================
router.get("/", async (req, res) => {
  try {
    const visits = await Visit.find().sort({ srNo: -1 });
    res.json(visits);
  } catch (err) {
    console.error("❌ Visit Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ===========================
// 🔹 UPDATE (PATCH)
// ===========================
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVisit = await Visit.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedVisit) return res.status(404).json({ error: "Visit not found" });
    res.json(updatedVisit);
  } catch (err) {
    console.error("❌ Visit Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===========================
// 🔹 DELETE (DELETE)
// ===========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVisit = await Visit.findByIdAndDelete(id);
    if (!deletedVisit) return res.status(404).json({ error: "Visit not found" });
    res.json({ message: "Visit deleted successfully" });
  } catch (err) {
    console.error("❌ Visit Delete Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ===========================
// 🔹 EXPORT EXCEL
// ===========================
router.get("/export/excel", async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.DOWNLOAD_PASSWORD) {
    return res.status(401).json({ error: "Invalid master password" });
  }

  try {
    const visits = await Visit.find().sort({ srNo: 1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Visit Data");

    sheet.columns = [
      { header: "Sr No", key: "srNo", width: 10 },
      { header: "Client Name", key: "clientName", width: 25 },
      { header: "Company Name", key: "companyName", width: 25 },
      { header: "Segment", key: "segment", width: 15 },
      { header: "Contact Number", key: "contactNumber", width: 15 },
      { header: "Alternative Number", key: "alternativeNumber", width: 15 },
      { header: "Area", key: "area", width: 20 },
      { header: "Reference By", key: "referenceBy", width: 20 },
      { header: "Source", key: "source", width: 20 },
      { header: "Meeting With", key: "meetingWith", width: 20 },
      { header: "Meeting Date", key: "meetingDate", width: 15 },
      { header: "Revisit Dates", key: "revisitDates", width: 30 },
      { header: "Submitted At", key: "submittedAt", width: 20 },
    ];

    // Format header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "99CCFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    visits.forEach((v) => {
      sheet.addRow({
        srNo: v.srNo,
        clientName: v.clientName,
        companyName: v.companyName,
        segment: v.segment,
        contactNumber: v.contactNumber,
        alternativeNumber: v.alternativeNumber,
        area: v.area,
        referenceBy: v.referenceBy,
        source: v.source,
        meetingWith: v.meetingWith,
        meetingDate: v.meetingDate ? new Date(v.meetingDate).toLocaleDateString("en-IN") : "",
        revisitDates: v.revisitDates && v.revisitDates.length > 0
          ? v.revisitDates.map(d => new Date(d).toLocaleDateString("en-IN")).join(", ")
          : "",
        submittedAt: v.submittedAt ? new Date(v.submittedAt).toLocaleString("en-IN") : "",
      });
    });

    const filePath = path.join(__dirname, "..", "visit-data.xlsx");
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "visit-data.xlsx", (err) => {
      if (err) console.error("❌ Excel download error:", err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ Excel export error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

export default router;
