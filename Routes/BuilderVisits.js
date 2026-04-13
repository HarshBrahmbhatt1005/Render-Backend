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
      "boxPrice",
      "timeLimitMonths",
    ];
    numFields.forEach((f) => (req.body[f] = safeNumber(req.body[f])));

    // date conversion

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
    const { view } = req.query;
    let query = {};

    // If no 'view=all' flag, only return pending or rejected cards (Level 2 not approved)
    if (view !== "all") {
      query = { "approval.level2.status": { $ne: "Approved" } };
    }

    const visits = await BuilderVisitData.find(query).sort({ createdAt: -1 });
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

    // If both levels are approved, set legacy approvalStatus
    if (
      visit.approval.level1?.status === "Approved" &&
      visit.approval.level2?.status === "Approved"
    ) {
      visit.approvalStatus = "Approved";
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

    // Update legacy approvalStatus to indicate changes needed
    visit.approvalStatus = "Changes Needed";

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
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");
    
    // ✅ Define columns - All fields from form
    sheet.columns = [
      { header: "Sai-Fakira Manager", key: "saiFakiraManager", width: 18 },
      { header: "Developer Name", key: "developerName", width: 20 },
      { header: "Developer Number", key: "developerNumber", width: 15 },
      { header: "Group Name", key: "groupName", width: 20 },
      { header: "Project Name", key: "projectName", width: 20 },
      { header: "Location", key: "location", width: 18 },
      { header: "Developer Office Person", key: "officePersonDetails", width: 25 },
      { header: "Developer Office Person Number", key: "officePersonNumber", width: 18 },
      { header: "Executives", key: "executives", width: 35 },
      { header: "Development Type", key: "developmentType", width: 15 },
      { header: "Stage of Construction", key: "stageOfConstruction", width: 18 },
      { header: "Area Type", key: "areaType", width: 12 },
      { header: "Total Units", key: "totalUnitsBlocks", width: 12 },
      { header: "Total Blocks", key: "totalBlocks", width: 12 },
      { header: "Clear Floor Height", key: "clearFloorHeight", width: 15 },
      { header: "Clear Floor Height (Retail)", key: "clearFloorHeightRetail", width: 15 },
      { header: "Clear Floor Height (Flats)", key: "clearFloorHeightFlats", width: 15 },
      { header: "Clear Floor Height (Offices)", key: "clearFloorHeightOffices", width: 15 },
      { header: "Community/Gentry", key: "gentry", width: 18 },
      { header: "Expected Completion Date", key: "expectedCompletionDate", width: 18 },
      { header: "Financing Requirements", key: "financingRequirements", width: 18 },
      { header: "Avg Agreement Value", key: "avgAgreementValue", width: 18 },
      { header: "Box Price", key: "boxPrice", width: 12 },
      { header: "Negotiable", key: "negotiable", width: 12 },
      { header: "Nearby Projects", key: "nearbyProjects", width: 25 },
      { header: "Enquiry Type", key: "enquiryType", width: 12 },
      { header: "Units For Sale", key: "unitsForSale", width: 12 },
      { header: "USPs", key: "usps", width: 30 },
      { header: "Total Amenities", key: "totalAmenities", width: 12 },
      { header: "Alloted Car Parking", key: "allotedCarParking", width: 15 },
      { header: "Payout", key: "payout", width: 12 },
      { header: "Remark", key: "remark", width: 25 },
      { header: "Property Details", key: "propertyDetails", width: 50 },
      { header: "Submitted Date", key: "submittedAt", width: 18 },
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

    // ✅ Add rows with all fields
    visits.forEach((v) => {
      const propertyString = v.propertySizes
        .map(
          (p, i) =>
            `Property ${i + 1}:\n` +
            [
              p.size ? `Size: ${p.size}` : "",
              p.floor ? `Floor: ${p.floor}` : "",
              p.sqft ? `SqFt: ${p.sqft}` : "",
              p.aecAuda ? `AEC/AUDA: ${p.aecAuda}` : "",
              p.selldedAmount ? `Sellded: ${p.selldedAmount}` : "",
              p.boxPrice ? `Box Price: ${p.boxPrice}` : "",
              p.downPayment ? `Down Payment: ${p.downPayment}` : "",
              p.maintenance
                ? `Maintenance: ${p.maintenance}`
                : "",
              p.plc ? `PLC: ${p.plc}` : "",
              p.frc ? `FRC: ${p.frc}` : "",
              p.maintenanceDeposit ? `Maintenance Deposit: ${p.maintenanceDeposit}` : "",
              p.category ? `Category: ${p.category}` : "",
              p.sqyd ? `Sq Yd: ${p.sqyd}` : "",
              p.basicRate ? `Basic Rate: ${p.basicRate}` : "",
            ]
            .filter(Boolean)
            .join(" | ")
          )
          .join("\n\n");
          
          const executivesString = v.executives && v.executives.length > 0
          ? v.executives.map((e) => `${e.name} (${e.number})`).join("; ")
          : "";
          
          const uspsString = v.usps && v.usps.length > 0 ? v.usps.join(", ") : "";
          
          const row = sheet.addRow({
        saiFakiraManager: v.saiFakiraManager || "",
        developerName: v.builderName,
        developerNumber: v.builderNumber,
        groupName: v.groupName,
        projectName: v.projectName,
        location: v.location,
        officePersonDetails: v.officePersonDetails,
        officePersonNumber: v.officePersonNumber,
        executives: executivesString,
        developmentType: v.developmentType,
        stageOfConstruction: v.stageOfConstruction,
        areaType: v.areaType || "",
        totalUnitsBlocks: v.totalUnitsBlocks,
        totalBlocks: v.totalBlocks || "",
        clearFloorHeight: v.clearFloorHeight || "",
        clearFloorHeightRetail: v.clearFloorHeightRetail || "",
        clearFloorHeightFlats: v.clearFloorHeightFlats || "",
        clearFloorHeightOffices: v.clearFloorHeightOffices || "",
        gentry: v.gentry,
        expectedCompletionDate: v.expectedCompletionDate || "",
        financingRequirements: v.financingRequirements,
        avgAgreementValue: v.avgAgreementValue || "",
        boxPrice: v.boxPrice || "",
        negotiable: v.negotiable || "",
        nearbyProjects: v.nearbyProjects,
        enquiryType: v.enquiryType,
        unitsForSale: v.unitsForSale,
        usps: uspsString,
        totalAmenities: v.totalAmenities || "",
        allotedCarParking: v.allotedCarParking || "",
        payout: v.payout,
        remark: v.remark,
        propertyDetails: propertyString,

        submittedAt: v.submittedAt ? new Date(v.submittedAt).toLocaleDateString('en-IN') : "",
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
