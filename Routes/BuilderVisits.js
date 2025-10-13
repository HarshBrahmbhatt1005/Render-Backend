import express from "express";
import BuilderVisitData from "../models/BuilderVisitData.js";

const router = express.Router();

// POST - create a builder visit
router.post("/", async (req, res) => {
  try {
    const newVisit = new BuilderVisitData(req.body);
    newVisit.approvalStatus = "Pending";
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - fetch all builder visits
router.get("/", async (req, res) => {
  try {
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// PATCH - approve a builder visit
router.patch("/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Approved" },
      { new: true }
    );
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH - reject a builder visit
router.patch("/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    const visit = await BuilderVisitData.findByIdAndUpdate(
      id,
      { approvalStatus: "Rejected" },
      { new: true }
    );
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
