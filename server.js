import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from 'dotenv';

import path from "path";
import { fileURLToPath } from "url";
import Application from "./models/Application.js";
import exportToExcel from "./ExportToExcel.js";
import builderVisitsRouter from "./Routes/BuilderVisits.js";
import exportRoutes from "./Routes/exportRoutes.js";
import monthlyExportRoutes from "./Routes/monthlyExportRoutes.js";

dotenv.config();

const app = express(); // ✅ app initialization must be first

// ✅ __dirname support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS setup

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);

// ✅ Body parser
app.use(express.json());

// ===========================
// 🔹 Helper Functions
// ===========================

// Convert various date formats to YYYY-MM-DD for HTML date inputs
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // If in DD-MM-YYYY format, convert to YYYY-MM-DD
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-");
    return `${year}-${month}-${day}`;
  }
  
  // Try parsing as Date object
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error("Date parsing error:", e);
  }
  
  return "";
}

// Format application dates for frontend
function formatApplicationDates(app) {
  if (!app) return app;
  
  const formatted = app.toObject ? app.toObject() : { ...app };
  
  // Format main date fields
  if (formatted.loginDate) formatted.loginDate = formatDateForInput(formatted.loginDate);
  if (formatted.sanctionDate) formatted.sanctionDate = formatDateForInput(formatted.sanctionDate);
  if (formatted.disbursedDate) formatted.disbursedDate = formatDateForInput(formatted.disbursedDate);
  if (formatted.pdDate) formatted.pdDate = formatDateForInput(formatted.pdDate);
  
  // Format part disbursed dates
  if (formatted.partDisbursed && Array.isArray(formatted.partDisbursed)) {
    formatted.partDisbursed = formatted.partDisbursed.map(part => ({
      ...part,
      date: formatDateForInput(part.date)
    }));
  }
  
  return formatted;
}

// ===========================
// 🔹 Builder Visits Routes
// ===========================
app.use("/api/builder-visits", builderVisitsRouter);

// ===========================
// 🔹 Excel Export Routes
// ===========================
app.use("/api/export", exportRoutes);

// ===========================
// 🔹 Monthly Customer Export Routes
// ===========================
app.use("/api/customer", monthlyExportRoutes);

// ===========================
// 🔹 Applications Routes
// ===========================
app.post("/api/applications", async (req, res) => {
  try {
    const newApp = new Application(req.body);
    await newApp.save();
    
    // Format dates before sending response
    const formattedApp = formatApplicationDates(newApp);
    res.status(201).json(formattedApp);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/applications", async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    // Format dates for all applications
    const formattedApps = apps.map(app => formatApplicationDates(app));
    res.json(formattedApps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// GET - fetch single application by ID
app.get("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const app = await Application.findById(id);
    
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    // Format dates before sending
    const formattedApp = formatApplicationDates(app);
    res.json(formattedApp);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const importantFields = [
      "remark",
      "feesRefundAmount",
      "expenceAmount",
      "consulting",
      "ProcessingFees",
      "payout",
      "status",
    ];
    const appData = await Application.findById(id);

    let resetStatus = false;
    importantFields.forEach((field) => {
      // compare even if value is empty
      if (
        updatedData.hasOwnProperty(field) &&
        updatedData[field] !== appData[field]
      ) {
        resetStatus = true;
      }
    });

    if (resetStatus) {
      updatedData.approvalStatus = "";
    }

    // always allow remark to update
    const updatedApp = await Application.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true }
    );

    // Format dates before sending response
    const formattedApp = formatApplicationDates(updatedApp);
    res.json(formattedApp);
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.patch("/api/applications/:id/pd-update", async (req, res) => {
  try {
    const { id } = req.params;
    const { pdStatus, pdRemark } = req.body;

    // Validate at least one field is provided
    if (pdStatus === undefined && pdRemark === undefined) {
      return res.status(400).json({ 
        error: "At least one field (pdStatus or pdRemark) is required" 
      });
    }

    const updateData = {};
    if (pdStatus !== undefined) updateData.pdStatus = pdStatus;
    if (pdRemark !== undefined) updateData.pdRemark = pdRemark;

    const updatedApp = await Application.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedApp) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Format dates before sending response
    const formattedApp = formatApplicationDates(updatedApp);

    res.json({
      message: "PD fields updated successfully",
      pdStatus: formattedApp.pdStatus,
      pdRemark: formattedApp.pdRemark,
      application: formattedApp
    });
  } catch (err) {
    console.error("❌ PD Update error:", err);
    res.status(500).json({ error: "PD update failed" });
  }
});

app.patch("/api/applications/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    await Application.findByIdAndUpdate(id, {
      approvalStatus: "Approved by SB",
    });
    res.json({ message: "Application approved successfully" });
  } catch (err) {
    console.error("❌ Approve error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/applications/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    await Application.findByIdAndUpdate(id, {
      approvalStatus: "Rejected by SB",
    });
    res.json({ message: "Application rejected successfully" });
  } catch (err) {
    console.error("❌ Reject error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/verify-edit", (req, res) => {
  const { sales, password } = req.body;

  if (!sales || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const envKey = `${(sales || "")
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .toUpperCase()}_PASSWORD`;

  const expected = process.env[envKey];

  if (!expected) {
    return res
      .status(404)
      .json({ error: `No password configured for "${sales}"` });
  }

  if (password !== expected) {
    // explicit helpful message
    return res.status(401).json({ error: "Invalid password" });
  }

  return res.status(200).json({ ok: true, message: "Verified" });
});

// ===========================
// 🔹 MongoDB Connect & Start Server
// ===========================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));
