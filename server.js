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
// 🔹 Builder Visits Routes
// ===========================
app.use("/api/builder-visits", builderVisitsRouter);

// ===========================
// 🔹 Excel Export Routes
// ===========================
app.use("/api/export", exportRoutes);

// ===========================
// 🔹 Applications Routes
// ===========================
app.post("/api/applications", async (req, res) => {
  try {
    const newApp = new Application(req.body);
    await newApp.save();
    res.status(201).json(newApp);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/applications", async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
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

    res.json(updatedApp);
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: "Update failed" });
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
