import express from "express";
import Application from "../models/Application.js";
import exportToExcel from "../ExportToExcel.js";
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

export default router;
