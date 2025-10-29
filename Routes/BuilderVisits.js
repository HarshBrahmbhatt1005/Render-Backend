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

// ===========================
// 🔹 CREATE (POST)
// ===========================
router.post("/", async (req, res) => {
  try {
    if (
      !req.body.propertySizes ||
      !Array.isArray(req.body.propertySizes) ||
      req.body.propertySizes.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "At least one property size is required" });
    }

    // filter out empty property objects
    req.body.propertySizes = req.body.propertySizes.filter(
      (p) =>
        p.size ||
        p.floor ||
        p.sqft ||
        p.aecAuda ||
        p.selldedAmount ||
        p.regularPrice ||
        p.downPayment ||
        p.maintenance
    );

    const numFields = [
      "avgAgreementValue",
      "marketValue",
      "unitsForSale",
      "timeLimitMonths",
      "payout",
    ];
    numFields.forEach((f) => (req.body[f] = safeNumber(req.body[f])));

    // date conversion
    ["dateOfVisit", "expectedCompletionDate"].forEach((f) => {
      if (req.body[f]) {
        const d = new Date(req.body[f]);
        req.body[f] = isNaN(d) ? null : d;
      }
    });

    const newVisit = new BuilderVisitData({
      ...req.body,
      approvalStatus: "Pending",
    });

    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================
// 🔹 FETCH ALL (GET)
// ===========================
router.get("/", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ===========================
// 🔹 UPDATE / EDIT (PATCH)
// ===========================
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedVisit = await BuilderVisitData.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      }
    );

    if (!updatedVisit)
      return res.status(404).json({ error: "Builder visit not found" });

    res.json(updatedVisit);
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ===========================
// 🔹 APPROVE (PATCH)
// ===========================
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (password && password !== process.env.APPROVAL_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Approved" },
      { new: true }
    );

    if (!visit)
      return res.status(404).json({ error: "Builder visit not found" });

    res.json(visit);
  } catch (err) {
    console.error("❌ Approve Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===========================
// 🔹 REJECT (PATCH)
// ===========================
router.patch("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (password && password !== process.env.APPROVAL_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Rejected" },
      { new: true }
    );

    if (!visit)
      return res.status(404).json({ error: "Builder visit not found" });

    res.json(visit);
  } catch (err) {
    console.error("❌ Reject Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===========================
// 🔹 EXPORT EXCEL
// ===========================

router.get("/export/excel", async (req, res) => {
  const { password } = req.query;
  if (password !== process.env.DOWNLOAD_PASSWORD)
    return res.status(401).json({ error: "Invalid master password" });

  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    // ✅ Define columns
    sheet.columns = [
      { header: "Builder Name", key: "builderName", width: 25 },
      { header: "Group Name", key: "groupName", width: 25 },
      { header: "Project Name", key: "projectName", width: 25 },
      { header: "Location", key: "location", width: 20 },
      {
        header: "Developer Office Person",
        key: "officePersonDetails",
        width: 30,
      },
      { header: "Development Type", key: "developmentType", width: 20 },
      { header: "Property Details", key: "propertyDetails", width: 60 },
      { header: "Total Units / Blocks", key: "totalUnitsBlocks", width: 25 },
      {
        header: "Stage of Construction",
        key: "stageOfConstruction",
        width: 20,
      },
      { header: "Current Phase", key: "currentPhase", width: 20 },
      {
        header: "Expected Completion Date",
        key: "expectedCompletionDate",
        width: 20,
      },
      {
        header: "Financing Requirements",
        key: "financingRequirements",
        width: 20,
      },
      { header: "Avg Agreement Value", key: "avgAgreementValue", width: 20 },
      { header: "Market Value", key: "marketValue", width: 20 },
      { header: "Gentry", key: "gentry", width: 15 },
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
      { header: "Payout", key: "payout", width: 15 },
      { header: "Approval Status", key: "approvalStatus", width: 20 },
    ];

    // ✅ Format header row (bold + yellow background + centered)
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } }; // black bold
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" }, // yellow background
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ✅ Add rows with wrapping
    visits.forEach((v) => {
      const propertyString = v.propertySizes
        .map(
          (p, i) =>
            `Property ${i + 1}:\n` + // line break after each property
            [
              p.size ? `Size: ${p.size}` : "",
              p.floor ? `Floor: ${p.floor}` : "",
              p.sqft ? `SqFt: ${p.sqft}` : "",
              p.aecAuda ? `AEC/AUDA: ${p.aecAuda}` : "",
              p.selldedAmount ? `Sellded: ${p.selldedAmount}` : "",
              p.regularPrice ? `Regular: ${p.regularPrice}` : "",
              p.downPayment ? `Down Payment: ${p.downPayment}` : "",
              p.maintenance ? `Maintenance: ${p.maintenance}` : "",
            ]
              .filter(Boolean)
              .join(" | ")
        )
        .join("\n\n"); // double line break between properties

      const row = sheet.addRow({
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
        expectedCompletionDate: v.expectedCompletionDate
          ? v.expectedCompletionDate.toISOString().split("T")[0]
          : "",
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

      // ✅ Apply wrapping and border to every cell
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // ✅ Auto-adjust row height for better readability
    sheet.eachRow((row) => {
      row.height = Math.min(200, row.height * 1.5); // limit height to avoid huge rows
    });

    // ✅ Save + download
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
