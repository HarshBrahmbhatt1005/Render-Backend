import express from "express";
import BuilderVisitData from "../models/BuilderVisitData.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper: safe number conversion
const safeNumber = (val) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

// POST - create a builder visit
router.post("/", async (req, res) => {
  try {
    // propertySizes must be array and at least 1 valid object
    if (!req.body.propertySizes || !Array.isArray(req.body.propertySizes) || req.body.propertySizes.length === 0) {
      return res.status(400).json({ error: "At least one property size is required" });
    }

    // Remove empty propertySizes objects
    req.body.propertySizes = req.body.propertySizes.filter(
      (p) => p.size || p.floor || p.sqft || p.aecAuda || p.selldedAmount || p.regularPrice || p.downPayment || p.maintenance
    );

    if (req.body.propertySizes.length === 0) {
      return res.status(400).json({ error: "All property details are empty" });
    }

    // Convert number fields safely
    const numFields = ["avgAgreementValue", "marketValue", "unitsForSale", "timeLimitMonths", "payout"];
    numFields.forEach((f) => {
      req.body[f] = safeNumber(req.body[f]);
    });

    // Convert date fields safely
    if (req.body.dateOfVisit) {
      const d = new Date(req.body.dateOfVisit);
      req.body.dateOfVisit = isNaN(d) ? null : d;
    }
    if (req.body.expectedCompletionDate) {
      const d = new Date(req.body.expectedCompletionDate);
      req.body.expectedCompletionDate = isNaN(d) ? null : d;
    }

    const newVisit = new BuilderVisitData(req.body);
    newVisit.approvalStatus = "Pending";

    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - fetch all visits
router.get("/", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// PATCH - approve visit
router.patch("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (password !== process.env.APPROVAL_PASSWORD) return res.status(401).json({ error: "Invalid password" });

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(id, { approvalStatus: "Approved" }, { new: true });
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH - reject visit
router.patch("/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (password !== process.env.APPROVAL_PASSWORD) return res.status(401).json({ error: "Invalid password" });

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(id, { approvalStatus: "Rejected" }, { new: true });
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// EXPORT EXCEL
router.get("/export/excel", async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.DOWNLOAD_PASSWORD) return res.status(401).json({ error: "Invalid master password" });

  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    sheet.columns = [
      { header: "Builder Name", key: "builderName", width: 25 },
      { header: "Group Name", key: "groupName", width: 25 },
      { header: "Project Name", key: "projectName", width: 25 },
      { header: "Location", key: "location", width: 20 },
      { header: "Developer Office Person", key: "officePersonDetails", width: 30 },
      { header: "Development Type", key: "developmentType", width: 20 },
      { header: "Property Details", key: "propertyDetails", width: 60 },
      { header: "Total Units / Blocks", key: "totalUnitsBlocks", width: 25 },
      { header: "Stage of Construction", key: "stageOfConstruction", width: 20 },
      { header: "Current Phase", key: "currentPhase", width: 20 },
      { header: "Expected Completion Date", key: "expectedCompletionDate", width: 20 },
      { header: "Financing Requirements", key: "financingRequirements", width: 20 },
      { header: "Avg Agreement Value", key: "avgAgreementValue", width: 20 },
      { header: "Market Value", key: "marketValue", width: 20 },
      { header: "Gentry", key: "gentry", width: 15 },
      { header: "Nearby Projects", key: "nearbyProjects", width: 30 },
      { header: "Surrounding Community", key: "surroundingCommunity", width: 30 },
      { header: "Enquiry Type", key: "enquiryType", width: 20 },
      { header: "Units For Sale", key: "unitsForSale", width: 15 },
      { header: "Time Limit (Months)", key: "timeLimitMonths", width: 20 },
      { header: "Remark", key: "remark", width: 30 },
      { header: "Payout", key: "payout", width: 15 },
      { header: "Approval Status", key: "approvalStatus", width: 20 },
    ];

    visits.forEach((v) => {
      const propertyString = v.propertySizes
        .map(
          (p, i) =>
            `Property ${i + 1}: ${p.size ? `Size: ${p.size}` : ""} ${p.floor ? `Floor: ${p.floor}` : ""} ${p.sqft ? `SqFt: ${p.sqft}` : ""} ${p.aecAuda ? `AEC/AUDA: ${p.aecAuda}` : ""} ${p.selldedAmount ? `Sellded: ${p.selldedAmount}` : ""} ${p.regularPrice ? `Regular: ${p.regularPrice}` : ""} ${p.downPayment ? `Down Payment: ${p.downPayment}` : ""} ${p.maintenance ? `Maintenance: ${p.maintenance}` : ""}`
        )
        .join(" | ");

      sheet.addRow({
        builderName: v.builderName,
        groupName: v.groupName,
        projectName: v.projectName,
        location: v.location,
        officePersonDetails: v.officePersonDetails,
        developmentType: v.developmentType,
        propertyDetails: propertyString,
        totalUnitsBlocks: v.totalUnitsBlocks,
        stageOfConstruction: v.stageOfConstruction,
        currentPhase: v.currentPhase,
        expectedCompletionDate: v.expectedCompletionDate ? v.expectedCompletionDate.toISOString().split("T")[0] : "",
        financingRequirements: v.financingRequirements,
        avgAgreementValue: v.avgAgreementValue,
        marketValue: v.marketValue,
        gentry: v.gentry,
        nearbyProjects: v.nearbyProjects,
        surroundingCommunity: v.surroundingCommunity,
        enquiryType: v.enquiryType,
        unitsForSale: v.unitsForSale,
        timeLimitMonths: v.timeLimitMonths,
        remark: v.remark,
        payout: v.payout,
        approvalStatus: v.approvalStatus,
      });
    });

    const filePath = path.join(__dirname, "..", "builder-visits.xlsx");
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, "builder-visits.xlsx", (err) => {
      if (err) console.error("❌ Excel download error:", err);
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ Excel export error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

export default router;
