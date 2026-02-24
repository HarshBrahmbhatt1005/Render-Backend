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
  
  try {
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
  } catch (error) {
    console.error("⚠️ Error formatting application dates:", error);
    // Return original app if formatting fails
    return app.toObject ? app.toObject() : app;
  }
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

// In-memory cache for duplicate prevention (time-based idempotency)
const submissionCache = new Map();
const DUPLICATE_WINDOW_MS = 5000; // 5 seconds window

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of submissionCache.entries()) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) {
      submissionCache.delete(key);
    }
  }
}, 10000); // Clean every 10 seconds

app.post("/api/applications", async (req, res) => {
  try {
    console.log("📥 Received submission request");
    console.log("Request body keys:", Object.keys(req.body));
    
    // Validate required fields
    const { name, mobile, email } = req.body;
    
    if (!name || !mobile) {
      console.log("⚠️ Validation failed - missing required fields");
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "Name and mobile are required" 
      });
    }

    // Create idempotency key based on critical fields
    const idempotencyKey = `${mobile}_${email || 'no-email'}_${name}`.toLowerCase().trim();
    
    // Check for duplicate submission within time window
    const lastSubmission = submissionCache.get(idempotencyKey);
    const now = Date.now();
    
    if (lastSubmission && (now - lastSubmission) < DUPLICATE_WINDOW_MS) {
      console.log(`⚠️ Duplicate submission blocked: ${idempotencyKey}`);
      return res.status(409).json({ 
        error: "Duplicate submission detected",
        message: "Please wait a few seconds before submitting again"
      });
    }

    // Check for recent duplicate in database (last 5 seconds)
    const duplicateQuery = {
      name: name,
      mobile: mobile,
      createdAt: { $gte: new Date(now - DUPLICATE_WINDOW_MS) }
    };
    
    // Only add email to query if it's provided
    if (email) {
      duplicateQuery.email = email;
    }
    
    const recentDuplicate = await Application.findOne(duplicateQuery);

    if (recentDuplicate) {
      console.log(`⚠️ Database duplicate found: ${idempotencyKey}`);
      submissionCache.set(idempotencyKey, now);
      return res.status(409).json({ 
        error: "Duplicate submission detected",
        message: "This application was already submitted",
        existingId: recentDuplicate._id
      });
    }

    // Mark this submission in cache
    submissionCache.set(idempotencyKey, now);

    // Create and save new application
    const newApp = new Application(req.body);
    await newApp.save();
    
    console.log(`✅ Application saved successfully: ${newApp._id}`);
    
    // Format dates before sending response
    const formattedApp = formatApplicationDates(newApp);
    
    // Return formatted app directly for backward compatibility
    return res.status(201).json(formattedApp);
    
  } catch (err) {
    console.error("❌ Save Error:", err);
    console.error("Error details:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed",
        details: err.message 
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: "Duplicate entry",
        details: "An application with this information already exists" 
      });
    }
    
    // Generic server error
    return res.status(500).json({ 
      error: "Server error",
      message: "Failed to save application. Please try again.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get("/api/applications", async (req, res) => {
  try {
    console.log("📋 Fetching all applications...");
    const apps = await Application.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${apps.length} applications`);
    
    // Format dates for all applications
    const formattedApps = apps.map(app => formatApplicationDates(app));
    
    // Return array directly for backward compatibility
    return res.status(200).json(formattedApps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return res.status(500).json({ 
      error: "Failed to fetch applications",
      message: err.message 
    });
  }
});

// GET - fetch single application by ID
app.get("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "Invalid ID format" 
      });
    }
    
    const app = await Application.findById(id);
    
    if (!app) {
      return res.status(404).json({ 
        error: "Application not found" 
      });
    }
    
    // Format dates before sending
    const formattedApp = formatApplicationDates(app);
    
    // Return formatted app directly for backward compatibility
    return res.status(200).json(formattedApp);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    return res.status(500).json({ 
      error: "Failed to fetch application",
      message: err.message 
    });
  }
});

app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "Invalid ID format" 
      });
    }

    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).json({ 
        error: "No data provided for update" 
      });
    }

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
    
    if (!appData) {
      return res.status(404).json({ 
        error: "Application not found" 
      });
    }

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
    
    // Return formatted app directly for backward compatibility
    return res.status(200).json(formattedApp);
  } catch (err) {
    console.error("❌ Update error:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed",
        details: err.message 
      });
    }
    
    return res.status(500).json({ 
      error: "Update failed",
      message: err.message 
    });
  }
});

app.patch("/api/applications/:id/pd-update", async (req, res) => {
  try {
    const { id } = req.params;
    const { pdStatus, pdRemark } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "Invalid ID format" 
      });
    }

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
      return res.status(404).json({ 
        error: "Application not found" 
      });
    }

    // Format dates before sending response
    const formattedApp = formatApplicationDates(updatedApp);

    // Return in original format for backward compatibility
    return res.status(200).json({
      message: "PD fields updated successfully",
      pdStatus: formattedApp.pdStatus,
      pdRemark: formattedApp.pdRemark,
      application: formattedApp
    });
  } catch (err) {
    console.error("❌ PD Update error:", err);
    return res.status(500).json({ 
      error: "PD update failed",
      message: err.message 
    });
  }
});

app.patch("/api/applications/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "Invalid ID format" 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        error: "Password is required" 
      });
    }

    if (password !== process.env.APPROVAL_PASSWORD) {
      return res.status(401).json({ 
        error: "Invalid password" 
      });
    }

    const updatedApp = await Application.findByIdAndUpdate(
      id,
      { approvalStatus: "Approved by SB" },
      { new: true }
    );

    if (!updatedApp) {
      return res.status(404).json({ 
        error: "Application not found" 
      });
    }

    // Return in original format for backward compatibility
    return res.status(200).json({ 
      message: "Application approved successfully"
    });
  } catch (err) {
    console.error("❌ Approve error:", err);
    return res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
  }
});

app.patch("/api/applications/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "Invalid ID format" 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        error: "Password is required" 
      });
    }

    if (password !== process.env.APPROVAL_PASSWORD) {
      return res.status(401).json({ 
        error: "Invalid password" 
      });
    }

    const updatedApp = await Application.findByIdAndUpdate(
      id,
      { approvalStatus: "Rejected by SB" },
      { new: true }
    );

    if (!updatedApp) {
      return res.status(404).json({ 
        error: "Application not found" 
      });
    }

    // Return in original format for backward compatibility
    return res.status(200).json({ 
      message: "Application rejected successfully"
    });
  } catch (err) {
    console.error("❌ Reject error:", err);
    return res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
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
