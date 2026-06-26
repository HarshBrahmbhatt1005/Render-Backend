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
// CREATE (POST)
// ===========================
router.post("/", async (req, res) => {
  try {
    const newVisit = new Visit(req.body);
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("Visit Save Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===========================
// FETCH ALL (GET)
// ===========================
router.get("/", async (req, res) => {
  try {
    const visits = await Visit.find().sort({ srNo: -1 });
    res.json(visits);
  } catch (err) {
    console.error("Visit Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ===========================
// UPDATE (PATCH)
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
    console.error("Visit Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ===========================
// DELETE (DELETE)
// ===========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVisit = await Visit.findByIdAndDelete(id);
    if (!deletedVisit) return res.status(404).json({ error: "Visit not found" });
    res.json({ message: "Visit deleted successfully" });
  } catch (err) {
    console.error("Visit Delete Error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ===========================
// EXPORT EXCEL - matching SAMPLE file column format exactly
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
      { header: "SR NO ",         key: "srNo",              width: 10 },
      { header: "DATE",          key: "meetingDate",       width: 14 },
      { header: "CATEGORY",      key: "segment",           width: 18 },
      { header: "NAME  ",        key: "clientName",        width: 25 },
      { header: "NUMBER",        key: "contactNumber",     width: 14 },
      { header: "Number 2",      key: "alternativeNumber", width: 14 },
      { header: "compnany name ",  key: "companyName",       width: 25 },
      { header: "AREA",          key: "area",              width: 20 },
      { header: "SOURCE",        key: "source",            width: 18 },
      { header: "REF BY ",        key: "referenceBy",       width: 20 },
      { header: "MEETING BY",    key: "meetingWith",       width: 20 },
      { header: "RE VISIT DATE", key: "revisitDates",      width: 30 },
    ];

    // Yellow header styling to match SAMPLE file
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    });

    visits.forEach((v) => {
      sheet.addRow({
        srNo:              v.srNo,
        meetingDate:       v.meetingDate ? new Date(v.meetingDate).toLocaleDateString("en-IN") : "",
        segment:           v.segment,
        clientName:        v.clientName,
        contactNumber:     v.contactNumber,
        alternativeNumber: v.alternativeNumber || "",
        companyName:       v.companyName || "",
        area:              v.area || "",
        source:            v.source || "",
        referenceBy:       v.referenceBy || "",
        meetingWith:       v.meetingWith || "",
        revisitDates:
          v.revisitDates && v.revisitDates.length > 0
            ? v.revisitDates.map((d) => new Date(d).toLocaleDateString("en-IN")).join(", ")
            : "",
      });
    });

    const filePath = path.join(__dirname, "..", "visit-data.xlsx");
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "visit-data.xlsx", (err) => {
      if (err) console.error("Excel download error:", err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

// ===========================
// IMPORT FROM SAMPLE EXCEL (POST /api/visits/import/excel)
// Maps: SR NO→srNo, DATE→meetingDate+submittedAt, CATEGORY→segment,
//       NAME→clientName, NUMBER→contactNumber, Number 2→alternativeNumber,
//       COMPANY NAME→companyName, AREA→area, SOURCE→source,
//       REF BY→referenceBy, MEETING BY→meetingWith, RE VISIT DATE→revisitDates
//       STATUS column is intentionally skipped.
// ===========================
router.post("/import/excel", async (req, res) => {
  const { password, fileBuffer } = req.body;
  if (password !== process.env.DOWNLOAD_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }
  if (!fileBuffer) {
    return res.status(400).json({ error: "No file buffer provided" });
  }

  const toTitleCase = (str) => {
    if (!str) return "";
    return String(str).trim().split(" ").map((w) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(" ");
  };

  const excelSerialToDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === "number") {
      return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const parsed = new Date(val);
    return isNaN(parsed) ? null : parsed;
  };

  try {
    // Decode base64 buffer back to binary buffer
    const buffer = Buffer.from(fileBuffer, "base64");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const rows = [];
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // skip header
      const v = row.values; // 1-indexed array

      const srNo      = v[1];
      const date      = v[2];
      const category  = v[3];
      const name      = v[4];
      const number    = v[5];
      const number2   = v[6];
      const company   = v[7];
      const area      = v[8];
      const source    = v[9];
      const refBy     = v[10];
      const meetingBy = v[11];
      const revisit   = v[12];
      // v[13] = STATUS — intentionally skipped

      if (!srNo || !name) return; // skip empty rows

      const meetingDate = excelSerialToDate(date);
      const revisitDates = revisit
        ? String(revisit).split(",").map((d) => excelSerialToDate(d.trim())).filter(Boolean)
        : [];

      rows.push({
        srNo:              Number(srNo) || undefined,
        clientName:        toTitleCase(name),
        companyName:       toTitleCase(company),
        segment:           category ? toTitleCase(category).trim() : "",
        contactNumber:     number ? Number(String(number).replace(/\D/g, "")) : undefined,
        alternativeNumber: number2 ? Number(String(number2).replace(/\D/g, "")) : undefined,
        area:              toTitleCase(area),
        source:            toTitleCase(source),
        referenceBy:       toTitleCase(refBy),
        meetingWith:       toTitleCase(meetingBy),
        meetingDate:       meetingDate,
        revisitDates:      revisitDates,
        submittedAt:       meetingDate, // meeting date = submitted at for bulk uploads
      });
    });

    let imported = 0, skipped = 0;
    for (const row of rows) {
      try {
        await Visit.findOneAndUpdate(
          { srNo: row.srNo },
          { $set: row }, // update or insert
          { upsert: true, new: true, runValidators: false }
        );
        imported++;
      } catch (e) {
        console.warn("Skipped srNo:", row.srNo, e.message);
        skipped++;
      }
    }

    res.json({ message: `Done. Imported: ${imported}, Skipped/Errors: ${skipped}` });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Import failed: " + err.message });
  }
});
// Temp chunk store in memory
const chunkStores = {};

router.post("/import/excel/chunk", async (req, res) => {
  const { password, uploadId, chunk, chunkIndex, totalChunks } = req.body;
  if (password !== process.env.DOWNLOAD_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  if (!chunkStores[uploadId]) {
    chunkStores[uploadId] = [];
  }

  chunkStores[uploadId][chunkIndex] = chunk;
  res.json({ success: true, message: `Received chunk ${chunkIndex + 1}/${totalChunks}` });
});

router.post("/import/excel/assemble", async (req, res) => {
  const { password, uploadId } = req.body;
  if (password !== process.env.DOWNLOAD_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const chunks = chunkStores[uploadId];
  if (!chunks) {
    return res.status(400).json({ error: "Upload session not found" });
  }

  const fileBufferStr = chunks.join("");
  delete chunkStores[uploadId]; // Clean up memory

  const toTitleCase = (str) => {
    if (!str) return "";
    return String(str).trim().split(" ").map((w) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(" ");
  };

  const excelSerialToDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === "number") {
      return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const parsed = new Date(val);
    return isNaN(parsed) ? null : parsed;
  };

  try {
    const buffer = Buffer.from(fileBufferStr, "base64");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const rows = [];
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const v = row.values;

      const srNo      = v[1];
      const date      = v[2];
      const category  = v[3];
      const name      = v[4];
      const number    = v[5];
      const number2   = v[6];
      const company   = v[7];
      const area      = v[8];
      const source    = v[9];
      const refBy     = v[10];
      const meetingBy = v[11];
      const revisit   = v[12];

      if (!srNo || !name) return;

      const meetingDate = excelSerialToDate(date);
      const revisitDates = revisit
        ? String(revisit).split(",").map((d) => excelSerialToDate(d.trim())).filter(Boolean)
        : [];

      rows.push({
        srNo:              Number(srNo) || undefined,
        clientName:        toTitleCase(name),
        companyName:       toTitleCase(company),
        segment:           category ? toTitleCase(category).trim() : "",
        contactNumber:     number ? Number(String(number).replace(/\D/g, "")) : undefined,
        alternativeNumber: number2 ? Number(String(number2).replace(/\D/g, "")) : undefined,
        area:              toTitleCase(area),
        source:            toTitleCase(source),
        referenceBy:       toTitleCase(refBy),
        meetingWith:       toTitleCase(meetingBy),
        meetingDate:       meetingDate,
        revisitDates:      revisitDates,
        submittedAt:       meetingDate,
      });
    });

    let imported = 0, skipped = 0;
    for (const row of rows) {
      try {
        await Visit.findOneAndUpdate(
          { srNo: row.srNo },
          { $set: row },
          { upsert: true, new: true, runValidators: false }
        );
        imported++;
      } catch (e) {
        console.warn("Skipped srNo:", row.srNo, e.message);
        skipped++;
      }
    }

    res.json({ message: `Done. Imported: ${imported}, Skipped/Errors: ${skipped}` });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Import failed: " + err.message });
  }
});

export default router;
