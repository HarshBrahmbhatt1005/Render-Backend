import express from "express";
import Application from "../models/Application.js";
import exportToExcel from "../ExportToExcel.js";
import dotenv from "dotenv";

const router = express.Router();

router.get("/excel", async (req, res) => {
  const { password, ref } = req.query;

  try {
    let expectedPass = process.env.DOWNLOAD_PASSWORD;

    if (ref && ref !== "All") {
      const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
      expectedPass = process.env[refKey];
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

// ========================================
// 🆕 MONTHLY EXCEL EXPORT ENDPOINT
// ========================================
router.get("/excel/monthly", async (req, res) => {
  const { password, month } = req.query;

  try {
    // ✅ Validate Password
    const expectedPass = process.env.DOWNLOAD_PASSWORD;
    if (!password || password !== expectedPass) {
      return res.status(401).json({ error: "Unauthorized: Invalid password" });
    }

    // ✅ Validate Month Format (YYYY-MM)
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        error: "Bad Request: Month must be in YYYY-MM format"
      });
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    // ✅ Validate month is valid (1-12)
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        error: "Bad Request: Month must be between 01 and 12"
      });
    }

    // ✅ Calculate date range
    const startDate = new Date(year, monthNum - 1, 1); // First day of month
    const endDate = new Date(year, monthNum, 0); // Last day of month
    endDate.setHours(23, 59, 59, 999);

    // ✅ Fetch applications within the month
    const apps = await Application.find({
      loginDate: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      }
    });

    // ✅ Generate Excel (with month filter)
    const { masterFilePath } = await exportToExcel(
      apps,
      null,
      { type: "monthly", month: monthStr, year: yearStr }
    );

    // ✅ Send file as download
    const filename = `applications_${month}.xlsx`;
    res.download(masterFilePath, filename, (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        res.status(500).json({ error: "Failed to download Excel file" });
      }
    });
  } catch (err) {
    console.error("❌ Monthly Excel Export Error:", err);
    res.status(500).json({ error: "Monthly Excel export failed" });
  }
});

// ========================================
// 🧪 TEST ROUTE
// ========================================
router.get("/test", (req, res) => {
  res.send("✅ Export API working");
});

export default router;
