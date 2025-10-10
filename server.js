import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Application from "./models/Application.js";
dotenv.config();

import exportToExcel from "./ExportToExcel.js";
const app = express();

// ✅ For __dirname support in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS setup for Netlify
app.use(cors({
  origin: ["https://your-netlify-site.netlify.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true
}));

app.use(express.json());

/* ================================
   🔹 Excel Export Route
================================ */
app.get("/api/export/excel", async (req, res) => {
  const { password, ref } = req.query;

  try {
    let expectedPass;

    if (ref && ref !== "All") {
      const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
      expectedPass = process.env[refKey];
    } else {
      expectedPass = process.env.DOWNLOAD_PASSWORD;
    }

    if (!password || password !== expectedPass) {
      return res.status(401).json({ error: "Unauthorized: Invalid password" });
    }

    const query = ref && ref !== "All" ? { sales: ref } : {};
    const apps = await Application.find(query);

    // ✅ Fix: destructure masterFilePath from object returned by exportToExcel
    const { masterFilePath } = await exportToExcel(apps, ref || "All");

    res.download(masterFilePath, `applications_${ref || "All"}.xlsx`, (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        res.status(500).json({ error: "Failed to download Excel file" });
      }
    });
  } catch (err) {
    console.error("❌ Excel Export Error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

/* ================================
   🔹 Create New Application
================================ */
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

/* ================================
   🔹 Get All Applications
================================ */
app.get("/api/applications", async (req, res) => {
  try {
    const apps = await Application.find();
    res.json(apps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

/* ================================
   🔹 Update Application by ID
================================ */
app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const importantFields = ["consulting", "payout", "exp", "refund", "remark"];
    const appData = await Application.findById(id);

    let resetStatus = false;
    importantFields.forEach((field) => {
      if (updatedData[field] && updatedData[field] !== appData[field]) {
        resetStatus = true;
      }
    });

    if (resetStatus) {
      updatedData.status = "Pending";
    }

    const updatedApp = await Application.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    res.json(updatedApp);
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* ================================
   🔹 Approve / Reject Routes
================================ */
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
    console.error("Approval error:", err);
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
    console.error("Reject error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   🔹 MongoDB Connection (Atlas)
================================ */
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

/* ================================
   🔹 Start Server
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
