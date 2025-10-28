import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Application from "./models/Application.js";
import exportToExcel from "./ExportToExcel.js";
import BuilderVisitData from "./models/BuilderVisitData.js"; // ✅ add this (for direct usage)

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize app
const app = express();

// ✅ __dirname setup (for ES modules)
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

// ✅ JSON body parser
app.use(express.json());

// ===========================
// 🔹 BUILDER VISITS ROUTES
// ===========================

// 🟢 Get all builder visits
app.get("/api/builder-visits", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (error) {
    console.error("❌ Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch builder visits" });
  }
});

// 🟢 Add new builder visit
app.post("/api/builder-visits", async (req, res) => {
  try {
    const newVisit = new BuilderVisitData(req.body);
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (error) {
    console.error("❌ Save error:", error);
    res.status(500).json({ error: "Failed to save builder visit" });
  }
});

// 🟢 Update builder visit (Fixes your 404 error)
app.patch("/api/builder-visits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVisit = await BuilderVisitData.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedVisit) {
      return res.status(404).json({ message: "Builder visit not found" });
    }

    res.json(updatedVisit);
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ error: "Failed to update builder visit" });
  }
});

// ===========================
// 🔹 EXCEL EXPORT ROUTE
// ===========================
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

// ===========================
// 🔹 APPLICATIONS ROUTES
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

    const importantFields = ["remark"];
    const appData = await Application.findById(id);

    let resetStatus = false;
    importantFields.forEach((field) => {
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

// ===========================
// 🔹 SERVER + DB CONNECTION
// ===========================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));
