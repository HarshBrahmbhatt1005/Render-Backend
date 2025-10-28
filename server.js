import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 🔹 Models
import Application from "./models/Application.js";
import BuilderVisitData from "./models/BuilderVisitData.js";

// 🔹 Helpers
import exportToExcel from "./ExportToExcel.js";

// 🔹 Routes
import builderVisitRoutes from "./routes/builderVisitRoutes.js"; // ✅ Make sure this file exists!

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize app
const app = express();

// ✅ __dirname setup (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware setup
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// =========================================================
// 🔹 ROUTES
// =========================================================

// ✅ 1. BUILDER VISITS (via dedicated router)
app.use("/api/builder-visits", builderVisitRoutes);

// ✅ 2. APPLICATION ROUTES
app.get("/api/applications", async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

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

app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const importantFields = ["remark"];
    const appData = await Application.findById(id);
    if (!appData) return res.status(404).json({ error: "Application not found" });

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

// ✅ APPROVE Application
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

// ✅ REJECT Application
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

// ✅ 3. EXCEL EXPORT ROUTE
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

// =========================================================
// 🔹 DB + SERVER
// =========================================================
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
