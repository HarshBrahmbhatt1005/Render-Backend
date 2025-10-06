import express from "express";
import Application from "../models/Application.js";

const router = express.Router();

// POST - save new application
router.post("/", async (req, res) => {
  try {
    const newApp = new Application(req.body);
    await newApp.save();
    res.json({ success: true, message: "Application saved", data: newApp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - fetch all applications
router.get("/", async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ✅ Approve/Reject API
app.put("/api/applications/:id/approval", async (req, res) => {
  const { id } = req.params;
  const { action, password } = req.body;

  // Password check
  if (password !== "yourSecret123") {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    let status = "";
    if (action === "approve") status = "Approved by SB";
    if (action === "reject") status = "Rejected by SB";

    await Application.findByIdAndUpdate(id, { status });

    res.json({ message: `Application ${status}` });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
