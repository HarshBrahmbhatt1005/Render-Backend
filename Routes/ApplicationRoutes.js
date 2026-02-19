import express from "express";
import dotenv from "dotenv";

import Application from "../models/Application.js";

const router = express.Router();

// POST - create application
router.post("/", async (req, res) => {
  try {
    const newApp = new Application(req.body);
    await newApp.save();
    res.status(201).json({ success: true, data: newApp });
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - fetch all applications
router.get("/", async (req, res) => {
  try {
    const apps = await Application.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH - update application
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const importantFields = ["consulting", "payout", "expenceAmount", "feesRefundAmount", "remark"];
    const appData = await Application.findById(id);

    let resetStatus = false;
    importantFields.forEach(field => {
      if(updatedData[field] && updatedData[field] !== appData[field]) resetStatus = true;
    });
    if(resetStatus) updatedData.status = "Pending";

    const updatedApp = await Application.findByIdAndUpdate(id, updatedData, { new: true });
    res.json(updatedApp);
  } catch(err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH - approve
router.patch("/:id/approve", async (req,res) => {
  const { id } = req.params;
  const { password } = req.body;
  if(password !== process.env.APPROVAL_PASSWORD) return res.status(401).json({ error: "Invalid password" });

  try {
    await Application.findByIdAndUpdate(id,{ approvalStatus: "Approved by SB" });
    res.json({ message: "Approved successfully" });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH - reject
router.patch("/:id/reject", async (req,res) => {
  const { id } = req.params;
  const { password } = req.body;
  if(password !== process.env.APPROVAL_PASSWORD) return res.status(401).json({ error: "Invalid password" });

  try {
    await Application.findByIdAndUpdate(id,{ approvalStatus: "Rejected by SB" });
    res.json({ message: "Rejected successfully" });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
