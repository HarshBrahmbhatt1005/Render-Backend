import express from "express";
import BuilderVisitData from "../models/BuilderVisitData.js";

const router = express.Router();

// POST - create a builder visit
router.post("/", async (req, res) => {
  try {
    const newVisit = new BuilderVisitData(req.body);
    newVisit.approvalStatus = "Pending";
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - fetch all builder visits
router.get("/", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// PATCH - approve a builder visit
router.patch("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Approved" },
      { new: true }
    );
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH - reject a builder visit
router.patch("/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Rejected" },
      { new: true }
    );
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/export/excel", async (req, res) => {
  const { password } = req.query;

  if (password !== process.env.DOWNLOAD_MASTER_PASSWORD) {
    return res.status(401).json({ error: "Invalid master password" });
  }

  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    sheet.columns = [
      { header: "Builder Name", key: "builderName", width: 25 },
      { header: "Group Name", key: "groupName", width: 25 },
      { header: "Project Name", key: "projectName", width: 25 },
      { header: "Location", key: "location", width: 20 },
      { header: "Person Met", key: "personMet", width: 20 },
      { header: "Development Type", key: "developmentType", width: 20 },
      { header: "Floor", key: "floor", width: 10 },
      { header: "SqFt", key: "sqft", width: 10 },
      { header: "AEC / AUDA", key: "aecAuda", width: 20 },
      { header: "Sellded Amount", key: "selldedAmount", width: 20 },
      { header: "Regular Price", key: "regularPrice", width: 20 },
      { header: "Down Payment", key: "downPayment", width: 20 },
      { header: "Maintenance", key: "maintenance", width: 20 },
      { header: "Total Units / Blocks", key: "totalUnitsBlocks", width: 25 },
      { header: "Current Phase", key: "currentPhase", width: 20 },
      {
        header: "Expected Completion Date",
        key: "expectedCompletionDate",
        width: 20,
      },
      { header: "Financing Req.", key: "financingRequirements", width: 15 },
      { header: "Financing Details", key: "financingDetails", width: 30 },
      { header: "Resident Type", key: "residentType", width: 20 },
      { header: "Avg Agreement Value", key: "avgAgreementValue", width: 20 },
      { header: "Market Value", key: "marketValue", width: 20 },
      { header: "Nearby Projects", key: "nearbyProjects", width: 30 },
      {
        header: "Surrounding Community",
        key: "surroundingCommunity",
        width: 30,
      },
      { header: "Enquiry Type", key: "enquiryType", width: 20 },
      { header: "Units For Sale", key: "unitsForSale", width: 15 },
      { header: "Time Limit (Months)", key: "timeLimitMonths", width: 20 },
      { header: "Remark", key: "remark", width: 30 },
      {header: "Payout", key: "payout", width: 10 },
      { header: "Approval Status", key: "approvalStatus", width: 15 },
    ];

    visits.forEach((v) => {
      sheet.addRow({
        builderName: v.builderName,
        groupName: v.groupName,
        projectName: v.projectName,
        location: v.location,
        personMet: v.personMet,
        developmentType: v.developmentType,
        floor: v.floor,
        sqft: v.sqft,
        aecAuda: v.aecAuda,
        selldedAmount: v.selldedAmount,
        regularPrice: v.regularPrice,
        downPayment: v.downPayment,
        maintenance: v.maintenance,
        totalUnitsBlocks: v.totalUnitsBlocks,
        currentPhase: v.currentPhase,
        expectedCompletionDate: v.expectedCompletionDate
          ? v.expectedCompletionDate.toISOString().split("T")[0]
          : "",
        financingRequirements: v.financingRequirements,
        financingDetails: v.financingDetails,
        residentType: v.residentType,
        avgAgreementValue: v.avgAgreementValue,
        marketValue: v.marketValue,
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
      fs.unlinkSync(filePath); // cleanup
    });
  } catch (err) {
    console.error("❌ Excel export error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

export default router;
