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
router.get("/export/excel", async (req, res) => {
  try {
    // Query params: builderName, status
    const { builderName, status } = req.query;

    const query = {};
    if (builderName) query.builderName = builderName;
    if (status) query.approvalStatus = status;

    const visits = await BuilderVisitData.find(query).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    sheet.columns = [
      { header: "Builder Name", key: "builderName", width: 20 },
      { header: "Project Name", key: "projectName", width: 20 },
      { header: "Visit Date", key: "dateOfVisit", width: 15 },
      { header: "Approval Status", key: "approvalStatus", width: 15 },
      { header: "Created At", key: "createdAt", width: 20 },
      // aur baaki fields same as before
    ];

    visits.forEach((v) => {
      sheet.addRow({
        ...v._doc,
        dateOfVisit: v.dateOfVisit ? v.dateOfVisit.toISOString().split("T")[0] : "",
        createdAt: v.createdAt ? v.createdAt.toISOString().split("T")[0] : "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="builder_visits.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);
  } catch (err) {
    console.error("❌ Excel export error:", err);
    res.status(500).json({ error: "Failed to export Excel" });
  }
});
  
export default router;
