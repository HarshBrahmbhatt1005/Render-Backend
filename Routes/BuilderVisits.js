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
    // Debug logging
    console.log("=== BUILDER VISIT CREATE DEBUG ===");
    console.log("Full request body:", JSON.stringify(req.body, null, 2));
    console.log("builderNumber:", req.body.builderNumber);
    console.log("officePersonNumber:", req.body.officePersonNumber);
    console.log("loanAccountNumber:", req.body.loanAccountNumber);
    console.log("saiFakiraManager:", req.body.saiFakiraManager);
    console.log("==================================");

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
      "boxPrice",
      "timeLimitMonths",
    ];
    numFields.forEach((f) => (req.body[f] = safeNumber(req.body[f])));

    // date conversion

    const newVisit = new BuilderVisitData({
      ...req.body,
      approvalStatus: "Pending",
    });

    console.log("=== BEFORE SAVE ===");
    console.log("loanAccountNumber:", newVisit.loanAccountNumber);
    console.log("saiFakiraManager:", newVisit.saiFakiraManager);
    console.log("===================");

    await newVisit.save();
    
    console.log("=== AFTER SAVE ===");
    console.log("loanAccountNumber:", newVisit.loanAccountNumber);
    console.log("saiFakiraManager:", newVisit.saiFakiraManager);
    console.log("==================");
    
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
    // Only fetch cards that are NOT Level 2 Approved
    // This ensures Level 2 approved cards don't show in the main dashboard
    const visits = await BuilderVisitData.find({
      $or: [
        { "approval.level2.status": { $ne: "Approved" } },
        { "approval.level2.status": { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ===========================
// 🔹 FETCH LEVEL 2 APPROVED (GET) - For Archive/History
// ===========================
router.get("/approved", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find({
      "approval.level2.status": "Approved"
    }).sort({ "approval.level2.at": -1 });
    
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Approved Error:", err);
    res.status(500).json({ error: "Fetch approved failed" });
  }
});

// ===========================
// 🔹 UPDATE / EDIT (PATCH)
// ===========================
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Debug logging
    console.log("=== BUILDER VISIT UPDATE DEBUG ===");
    console.log("ID:", id);
    console.log("builderNumber:", updateData.builderNumber);
    console.log("officePersonNumber:", updateData.officePersonNumber);
    console.log("loanAccountNumber:", updateData.loanAccountNumber);
    console.log("saiFakiraManager:", updateData.saiFakiraManager);
    console.log("propertySizes:", JSON.stringify(updateData.propertySizes, null, 2));
    console.log("==================================");

    // When a user edits a resource, reset approvals to Pending
    updateData.approval = {
      level1: { status: "Pending", by: "", at: null, comment: "" },
      level2: { status: "Pending", by: "", at: null, comment: "" },
    };

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
    const { password, level, comment } = req.body;

    // Enhanced debugging
    console.log("=== APPROVAL DEBUG ===");
    console.log("Entered password:", password);
    console.log("Password length:", password?.length);
    console.log("Level:", level, "Type:", typeof level);
    console.log("ENV Level1:", process.env.APPROVE_LEVEL1_PASSWORD);
    console.log("ENV Level1 length:", process.env.APPROVE_LEVEL1_PASSWORD?.length);
    console.log("ENV Level1 defined?", process.env.APPROVE_LEVEL1_PASSWORD !== undefined);
    console.log("ENV Level2:", process.env.APPROVE_LEVEL2_PASSWORD);
    console.log("ENV Level2 length:", process.env.APPROVE_LEVEL2_PASSWORD?.length);
    console.log("ENV Level2 defined?", process.env.APPROVE_LEVEL2_PASSWORD !== undefined);
    console.log("======================");

    if (![1, 2].includes(Number(level)))
      return res.status(400).json({ error: "Invalid level. Must be 1 or 2." });

    // Quick auth: verify password per level via env vars
    const requiredPwd =
      Number(level) === 1
        ? process.env.APPROVE_LEVEL1_PASSWORD
        : process.env.APPROVE_LEVEL2_PASSWORD;

    console.log("Required password:", requiredPwd);
    console.log("Required password length:", requiredPwd?.length);
    console.log("Passwords match?", password === requiredPwd);
    console.log("Password trimmed match?", password?.trim() === requiredPwd?.trim());

    if (!password || password !== requiredPwd)
      return res.status(401).json({ error: "Invalid password" });

    const visit = await BuilderVisitData.findById(id);
    if (!visit) return res.status(404).json({ error: "Builder visit not found" });

    // level 2 cannot be approved before level 1
    if (Number(level) === 2 && visit.approval?.level1?.status !== "Approved") {
      return res
        .status(400)
        .json({ error: "Level 1 must be approved before Level 2." });
    }

    const approver = (req.user && (req.user.email || req.user.id)) || `password-approver-level${level}`;
    const now = new Date();

    // Apply approval
    visit.approval = visit.approval || { level1: {}, level2: {} };
    visit.approval[`level${level}`] = {
      status: "Approved",
      by: approver,
      at: now,
      comment: comment || "",
    };

    // If both levels are approved, set legacy approvalStatus and mark as Level2Approved
    if (
      visit.approval.level1?.status === "Approved" &&
      visit.approval.level2?.status === "Approved"
    ) {
      visit.approvalStatus = "Level2Approved";
    } else if (visit.approval.level1?.status === "Approved") {
      visit.approvalStatus = "Level1Approved";
    }

    await visit.save();
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
    const { password, level, comment } = req.body;

    // Enhanced debugging
    console.log("=== REJECTION DEBUG ===");
    console.log("Entered password:", password);
    console.log("Password length:", password?.length);
    console.log("Level:", level, "Type:", typeof level);
    console.log("ENV Level1:", process.env.APPROVE_LEVEL1_PASSWORD);
    console.log("ENV Level2:", process.env.APPROVE_LEVEL2_PASSWORD);
    console.log("=======================");

    // Validate level
    if (![1, 2].includes(Number(level)))
      return res.status(400).json({ error: "Invalid level. Must be 1 or 2." });

    // Validate remarks parameter (required, non-empty, minimum length)
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: "Rejection remarks are required" });
    }

    if (comment.trim().length < 3) {
      return res.status(400).json({ error: "Rejection remarks must be at least 3 characters long" });
    }

    // Password validation
    const requiredPwd =
      Number(level) === 1
        ? process.env.APPROVE_LEVEL1_PASSWORD
        : process.env.APPROVE_LEVEL2_PASSWORD;

    console.log("Required password:", requiredPwd);
    console.log("Passwords match?", password === requiredPwd);

    if (!password || password !== requiredPwd)
      return res.status(401).json({ error: "Invalid password" });

    const visit = await BuilderVisitData.findById(id);
    if (!visit) return res.status(404).json({ error: "Builder visit not found" });

    const rejector = (req.user && (req.user.email || req.user.id)) || `password-rejector-level${level}`;
    const now = new Date();

    // Initialize approval object if not exists
    visit.approval = visit.approval || { level1: {}, level2: {} };

    // Implement rejection logic based on level
    if (Number(level) === 2) {
      // Level 2 rejection logic: reset Level 1 to "Pending" when Level 1 was "Approved"
      if (visit.approval.level1?.status === "Approved") {
        visit.approval.level1 = {
          status: "Pending",
          by: "",
          at: null,
          comment: ""
        };
      }

      // Set Level 2 to "Rejected"
      visit.approval.level2 = {
        status: "Rejected",
        by: rejector,
        at: now,
        comment: comment.trim()
      };
    } else {
      // Level 1 rejection logic: set Level 1 to "Rejected", keep Level 2 "Pending"
      visit.approval.level1 = {
        status: "Rejected",
        by: rejector,
        at: now,
        comment: comment.trim()
      };

      // Ensure Level 2 remains "Pending"
      if (!visit.approval.level2 || !visit.approval.level2.status) {
        visit.approval.level2 = {
          status: "Pending",
          by: "",
          at: null,
          comment: ""
        };
      }
    }

    // Update legacy approvalStatus based on rejection level
    if (Number(level) === 1) {
      visit.approvalStatus = "Level1Rejected";
    } else if (Number(level) === 2) {
      visit.approvalStatus = "Level2Rejected";
    }

    await visit.save();
    
    // Return updated approval object in response
    res.json({
      message: `Level ${level} rejected successfully`,
      approval: visit.approval,
      approvalStatus: visit.approvalStatus
    });
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
    // Only export Level 2 Approved properties
    const visits = await BuilderVisitData.find({
      "approval.level2.status": "Approved"
    }).sort({ createdAt: -1 });

    if (visits.length === 0) {
      return res.status(404).json({ 
        error: "No Level 2 approved properties found for export" 
      });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    // ✅ Define columns
    sheet.columns = [
      { header: "Builder Name", key: "builderName", width: 25 },
      { header: "Builder Number", key: "builderNumber", width: 20 },
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
      { header: "Developer Office Person Number", key: "officePersonNumber", width: 20 },
      { header: "Loan Account Number", key: "loanAccountNumber", width: 25 },
      { header: "Sai Fakira Manager", key: "saiFakiraManager", width: 25 },
      {
        header: "Stage of Construction",
        key: "stageOfConstruction",
        width: 25,
      },
      {
        header: "Expected Completion Date",
        key: "expectedCompletionDate",
        width: 20,
      },
      {
        header: "Financing Requirements",
        key: "financingRequirements",
        width: 25,
      },
      { header: "Avg Agreement Value", key: "avgAgreementValue", width: 20 },
      { header: "Gentry", key: "gentry", width: 20 },
      { header: "Nearby Projects", key: "nearbyProjects", width: 30 },
      { header: "Enquiry Type", key: "enquiryType", width: 20 },
      { header: "Units For Sale", key: "unitsForSale", width: 15 },
      { header: "Time Limit (Months)", key: "timeLimitMonths", width: 20 },
      { header: "Remark", key: "remark", width: 30 },
      { header: "Payout", key: "payout", width: 15 },
      { header: "Approval Status", key: "approvalStatus", width: 20 },
    ];

    // ✅ Format header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
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

    // ✅ Add rows
    visits.forEach((v) => {
      const propertyString = v.propertySizes
        .map(
          (p, i) =>
            `Property ${i + 1}:\n` +
            [
              p.size ? `Size: ${p.size}` : "",
              p.floor ? `Floor: ${p.floor}` : "",
              p.sqft ? `SqFt: ${p.sqft}` : "",
              p.sqyd ? `Sq.Yd: ${p.sqyd}` : "",
              p.category ? `Category: ${p.category}` : "",
              p.basicRate ? `Basic Rate: ${p.basicRate}` : "",
              p.aecAuda ? `AEC/AUDA: ${p.aecAuda}` : "",
              p.selldedAmount ? `Sellded: ${p.selldedAmount}` : "",
              p.boxPrice ? `Box Price: ${p.boxPrice}` : "",
              p.downPayment ? `Down Payment: ${p.downPayment}` : "",
              p.maintenance ? `Maintenance: ${p.maintenance}` : "",
              p.maintenanceDeposit ? `Maintenance Deposit: ${p.maintenanceDeposit}` : "",
              p.plc ? `PLC: ${p.plc}` : "",
              p.frc ? `FRC: ${p.frc}` : "",
            ]
              .filter(Boolean)
              .join(" | ")
        )
        .join("\n\n");

      const row = sheet.addRow({
        builderName: v.builderName,
        builderNumber: v.builderNumber,
        groupName: v.groupName,
        projectName: v.projectName,
        location: v.location,
        officePersonDetails: v.officePersonDetails,
        officePersonNumber: v.officePersonNumber,
        loanAccountNumber: v.loanAccountNumber,
        saiFakiraManager: v.saiFakiraManager,
        developmentType: v.developmentType,
        propertyDetails: propertyString,
        totalUnitsBlocks: v.totalUnitsBlocks,
        stageOfConstruction: v.stageOfConstruction,
        expectedCompletionDate: v.expectedCompletionDate || "",
        financingRequirements: v.financingRequirements,
        avgAgreementValue: v.avgAgreementValue,
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

    sheet.eachRow((row) => {
      row.height = Math.min(200, row.height * 1.5);
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
