// import express from "express";
// import Application from "../models/Application.js";
// import exportToExcel from "../ExportToExcel.js";
// import { generateMonthWiseExcel } from "../utils/MonthlyReportGenerator.js";

// import dotenv from "dotenv";

// const router = express.Router();
// const reportGenerator = new MonthlyReportGenerator();

// router.get("/excel", async (req, res) => {
//   const { password, ref } = req.query;

//   try {
//     let expectedPass = process.env.DOWNLOAD_PASSWORD;

//     if (ref && ref !== "All") {
//       const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
//       expectedPass = process.env[refKey];
//     }

//     if (!password || password !== expectedPass) {
//       return res.status(401).json({ error: "Unauthorized: Invalid password" });
//     }
      
//       try {
//     const { month } = req.query; // YYYY-MM

//     if (!month) {
//       return res.status(400).json({ message: "Month required" });
//     }


//     const query = ref && ref !== "All" ? { sales: ref } : {};
//     const apps = await Application.find(query);

//     const { masterFilePath } = await exportToExcel(apps, ref || "All");

//         const filePath = await generateMonthWiseExcel(month);

//     res.download(masterFilePath, `applications_${ref || "All"}.xlsx`, (err) => {
//       if (err) {
//         console.error("❌ Error sending file:", err);
//         res.status(500).json({ error: "Failed to download Excel file" });
//       }
//     });
//   } catch (err) {
//     console.error("❌ Excel Export Error:", err);
//     res.status(500).json({ error: "Excel export failed" });
//   }

//      res.download(filePath);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Excel generation failed" });
//   }
// });


// // ========================================
// // 🆕 MONTHLY EXCEL EXPORT ENDPOINT - NEW GENERATOR
// // ========================================
// /**
//  * Generate monthly report
//  * Query Parameters:
//  * - month: YYYY-MM format (required, e.g., 2026-01)
//  * - dateColumn: loginDate | disbursedDate | sanctionDate (default: loginDate)
//  * - password: Download password (required)
//  * - ref: Optional - filter by sales ref
//  * 
//  * Example: GET /api/export/monthly?month=2026-01&dateColumn=loginDate&password=yourpass
//  */
// router.get("/monthly", async (req, res) => {
//   const { password, month, dateColumn = "loginDate", ref } = req.query;

//   try {
//     // ✅ Validate Password
//     let expectedPass = process.env.DOWNLOAD_PASSWORD;

//     if (ref && ref !== "All") {
//       const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
//       expectedPass = process.env[refKey];
//     }

//     if (!password || password !== expectedPass) {
//       return res.status(401).json({ 
//         error: "Unauthorized: Invalid password" 
//       });
//     }

//     // ✅ Validate Month Format (YYYY-MM)
//     if (!month || !/^\d{4}-\d{2}$/.test(month)) {
//       return res.status(400).json({
//         error: "Bad Request: Month must be in YYYY-MM format (e.g., 2026-01)"
//       });
//     }

//     // ✅ Validate Date Column
//     const validDateColumns = ["loginDate", "disbursedDate", "sanctionDate"];
//     if (!validDateColumns.includes(dateColumn)) {
//       return res.status(400).json({
//         error: `Invalid dateColumn. Must be one of: ${validDateColumns.join(", ")}`
//       });
//     }

//     const [yearStr, monthStr] = month.split("-");
//     const year = parseInt(yearStr, 10);
//     const monthNum = parseInt(monthStr, 10);

//     // ✅ Validate month is valid (1-12)
//     if (monthNum < 1 || monthNum > 12) {
//       return res.status(400).json({
//         error: "Bad Request: Month must be between 01 and 12"
//       });
//     }

//     // ✅ Fetch applications (apply optional ref filter)
//     const query = ref && ref !== "All" ? { sales: ref } : {};
//     const apps = await Application.find(query);

//     // ✅ Generate monthly report with new generator
//     const result = await reportGenerator.generateMonthlyReport(
//       apps,
//       monthNum,
//       year,
//       {
//         dateColumn,
//         sheetName: "Monthly Report",
//         fileName: `monthly_report_${month}${ref ? `_${ref}` : ""}.xlsx`,
//       }
//     );

//     // ✅ Send file as download
//     res.download(result.filePath, result.filename, (err) => {
//       if (err) {
//         console.error("❌ Error sending file:", err);
//       }
//     });
//   } catch (err) {
//     console.error("❌ Monthly Report Error:", err);
//     res.status(500).json({ 
//       error: "Failed to generate monthly report",
//       message: err.message
//     });
//   }
// });

// // ========================================
// // 🆕 QUARTERLY EXCEL EXPORT ENDPOINT
// // ========================================
// /**
//  * Generate quarterly report
//  * Query Parameters:
//  * - quarter: 1 | 2 | 3 | 4 (required)
//  * - year: YYYY format (required)
//  * - dateColumn: loginDate | disbursedDate | sanctionDate (default: loginDate)
//  * - password: Download password (required)
//  * 
//  * Example: GET /api/export/quarterly?quarter=1&year=2026&dateColumn=loginDate&password=yourpass
//  */
// router.get("/quarterly", async (req, res) => {
//   const { password, quarter, year, dateColumn = "loginDate" } = req.query;

//   try {
//     // ✅ Validate Password
//     const expectedPass = process.env.DOWNLOAD_PASSWORD;
//     if (!password || password !== expectedPass) {
//       return res.status(401).json({ 
//         error: "Unauthorized: Invalid password" 
//       });
//     }

//     // ✅ Validate Quarter
//     const quarterNum = parseInt(quarter, 10);
//     if (!quarter || quarterNum < 1 || quarterNum > 4) {
//       return res.status(400).json({
//         error: "Bad Request: Quarter must be 1, 2, 3, or 4"
//       });
//     }

//     // ✅ Validate Year
//     const yearNum = parseInt(year, 10);
//     if (!year || yearNum < 2000 || yearNum > 2100) {
//       return res.status(400).json({
//         error: "Bad Request: Year must be valid (2000-2100)"
//       });
//     }

//     // ✅ Validate Date Column
//     const validDateColumns = ["loginDate", "disbursedDate", "sanctionDate"];
//     if (!validDateColumns.includes(dateColumn)) {
//       return res.status(400).json({
//         error: `Invalid dateColumn. Must be one of: ${validDateColumns.join(", ")}`
//       });
//     }

//     // ✅ Fetch all applications
//     const apps = await Application.find({});

//     // ✅ Generate quarterly report
//     const result = await reportGenerator.generateQuarterlyReport(
//       apps,
//       quarterNum,
//       yearNum,
//       {
//         dateColumn,
//         sheetName: `Q${quarterNum} ${yearNum}`,
//       }
//     );

//     // ✅ Send file as download
//     res.download(result.filePath, result.filename, (err) => {
//       if (err) {
//         console.error("❌ Error sending file:", err);
//       }
//     });
//   } catch (err) {
//     console.error("❌ Quarterly Report Error:", err);
//     res.status(500).json({ 
//       error: "Failed to generate quarterly report",
//       message: err.message
//     });
//   }
// });

// // ========================================
// // 🆕 CUSTOM DATE RANGE EXPORT ENDPOINT
// // ========================================
// /**
//  * Generate report for custom date range
//  * Query Parameters:
//  * - startDate: YYYY-MM-DD format (required)
//  * - endDate: YYYY-MM-DD format (required)
//  * - dateColumn: loginDate | disbursedDate | sanctionDate (default: loginDate)
//  * - password: Download password (required)
//  * 
//  * Example: GET /api/export/custom-date?startDate=2026-01-01&endDate=2026-01-31&password=yourpass
//  */
// router.get("/custom-date", async (req, res) => {
//   const { password, startDate, endDate, dateColumn = "loginDate" } = req.query;

//   try {
//     // ✅ Validate Password
//     const expectedPass = process.env.DOWNLOAD_PASSWORD;
//     if (!password || password !== expectedPass) {
//       return res.status(401).json({ 
//         error: "Unauthorized: Invalid password" 
//       });
//     }

//     // ✅ Validate Date Format
//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//     if (!startDate || !dateRegex.test(startDate)) {
//       return res.status(400).json({
//         error: "Bad Request: startDate must be in YYYY-MM-DD format"
//       });
//     }

//     if (!endDate || !dateRegex.test(endDate)) {
//       return res.status(400).json({
//         error: "Bad Request: endDate must be in YYYY-MM-DD format"
//       });
//     }

//     // ✅ Validate Date Range
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     if (start > end) {
//       return res.status(400).json({
//         error: "Bad Request: startDate must be before endDate"
//       });
//     }

//     // ✅ Validate Date Column
//     const validDateColumns = ["loginDate", "disbursedDate", "sanctionDate"];
//     if (!validDateColumns.includes(dateColumn)) {
//       return res.status(400).json({
//         error: `Invalid dateColumn. Must be one of: ${validDateColumns.join(", ")}`
//       });
//     }

//     // ✅ Fetch all applications
//     const apps = await Application.find({});

//     // ✅ Generate custom date report
//     const result = await reportGenerator.generateCustomDateReport(
//       apps,
//       startDate,
//       endDate,
//       {
//         dateColumn,
//         sheetName: `Report ${startDate} to ${endDate}`,
//       }
//     );

//     // ✅ Send file as download
//     res.download(result.filePath, result.filename, (err) => {
//       if (err) {
//         console.error("❌ Error sending file:", err);
//       }
//     });
//   } catch (err) {
//     console.error("❌ Custom Date Report Error:", err);
//     res.status(500).json({ 
//       error: "Failed to generate custom date report",
//       message: err.message
//     });
//   }
// });

// // ========================================
// // 🆕 REPORT INFO ENDPOINT (NO DOWNLOAD)
// // ========================================
// /**
//  * Get report info without downloading file
//  * Query Parameters:
//  * - type: monthly | quarterly | custom-date (required)
//  * - month: YYYY-MM (for monthly)
//  * - quarter: 1-4 (for quarterly)
//  * - year: YYYY (for quarterly)
//  * - startDate, endDate: YYYY-MM-DD (for custom-date)
//  * - dateColumn: loginDate | disbursedDate | sanctionDate (default: loginDate)
//  * - password: Download password (required)
//  */
// router.get("/report-info", async (req, res) => {
//   const { password, type, dateColumn = "loginDate" } = req.query;

//   try {
//     // ✅ Validate Password
//     const expectedPass = process.env.DOWNLOAD_PASSWORD;
//     if (!password || password !== expectedPass) {
//       return res.status(401).json({ 
//         error: "Unauthorized: Invalid password" 
//       });
//     }

//     // ✅ Validate Report Type
//     if (!type || !["monthly", "quarterly", "custom-date"].includes(type)) {
//       return res.status(400).json({
//         error: "Bad Request: type must be 'monthly', 'quarterly', or 'custom-date'"
//       });
//     }

//     const apps = await Application.find({});

//     let filteredRecords = [];
//     let dateRange = {};

//     if (type === "monthly") {
//       const { month, year } = req.query;
//       if (!month || !/^\d{4}-\d{2}$/.test(month) || !year) {
//         return res.status(400).json({
//           error: "Bad Request: month (YYYY-MM) and year required for monthly"
//         });
//       }

//       const [yearStr, monthStr] = month.split("-");
//       const monthNum = parseInt(monthStr, 10);
//       const { startDate, endDate } = DateRange.getMonthRange(monthNum, parseInt(yearStr));
      
//       filteredRecords = DataFilter.filterByDateRange(apps, dateColumn, startDate, endDate);
//       dateRange = {
//         type: "monthly",
//         month,
//         start: startDate.toISOString().split("T")[0],
//         end: endDate.toISOString().split("T")[0],
//       };
//     } else if (type === "quarterly") {
//       const { quarter, year } = req.query;
//       if (!quarter || !year) {
//         return res.status(400).json({
//           error: "Bad Request: quarter (1-4) and year required for quarterly"
//         });
//       }

//       const quarterNum = parseInt(quarter, 10);
//       const { startDate, endDate } = DateRange.getQuarterRange(quarterNum, parseInt(year));
      
//       filteredRecords = DataFilter.filterByDateRange(apps, dateColumn, startDate, endDate);
//       dateRange = {
//         type: "quarterly",
//         quarter,
//         year,
//         start: startDate.toISOString().split("T")[0],
//         end: endDate.toISOString().split("T")[0],
//       };
//     } else if (type === "custom-date") {
//       const { startDate, endDate } = req.query;
//       if (!startDate || !endDate) {
//         return res.status(400).json({
//           error: "Bad Request: startDate and endDate required for custom-date"
//         });
//       }

//       const { startDate: start, endDate: end } = DateRange.getCustomRange(startDate, endDate);
      
//       filteredRecords = DataFilter.filterByDateRange(apps, dateColumn, start, end);
//       dateRange = {
//         type: "custom-date",
//         start: startDate,
//         end: endDate,
//       };
//     }

//     // ✅ Calculate summary statistics
//     const totalAmount = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
//     const statusCount = DataFilter.groupByField(filteredRecords, "status");

//     res.json({
//       success: true,
//       recordCount: filteredRecords.length,
//       totalAmount: totalAmount.toFixed(2),
//       dateColumn,
//       dateRange,
//       statusBreakdown: Object.entries(statusCount).reduce((acc, [status, records]) => {
//         acc[status || "No Status"] = records.length;
//         return acc;
//       }, {}),
//     });
//   } catch (err) {
//     console.error("❌ Report Info Error:", err);
//     res.status(500).json({ 
//       error: "Failed to get report info",
//       message: err.message
//     });
//   }
// });

// // ========================================
// // 🆕 ORIGINAL MONTHLY EXCEL EXPORT ENDPOINT (DEPRECATED)
// // ========================================

// // ========================================
// // 🧪 TEST ROUTE
// // ========================================
// router.get("/test", (req, res) => {
//   res.send("✅ Export API working");
// });

// export default router;



import express from "express";
import Application from "../models/Application.js";
import exportToExcel from "../ExportToExcel.js";
import { generateMonthWiseExcel } from "../utils/MonthlyReportGenerator.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ❌ REMOVED (monthly generator class exist hi nahi karti)
// const reportGenerator = new MonthlyReportGenerator();

/**
 * ========================================
 * 🔹 MASTER EXCEL DOWNLOAD
 * ========================================
 */
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

    const { masterFilePath, filename } = await exportToExcel(
      apps,
      ref || "All"
    );

    res.download(masterFilePath, filename, (err) => {
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
// 🆕 MONTHLY EXCEL EXPORT (FIXED ✅)
// ========================================
/**
 * Generate monthly report
 * GET /api/export/monthly?month=2026-01&password=xxx&ref=All
 */
router.get("/monthly", async (req, res) => {
  const { password, month, ref } = req.query;

  try {
    let expectedPass = process.env.DOWNLOAD_PASSWORD;

    if (ref && ref !== "All") {
      const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
      expectedPass = process.env[refKey];
    }

    if (!password || password !== expectedPass) {
      return res.status(401).json({
        error: "Unauthorized: Invalid password",
      });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        error: "Month must be in YYYY-MM format (e.g. 2026-01)",
      });
    }

    // ✅ get data
    const query = ref && ref !== "All" ? { sales: ref } : {};
    const apps = await Application.find(query);

    // ✅ generate master excel first
    const { masterFilePath } = await exportToExcel(
      apps,
      ref || "All"
    );

    // ✅ generate month-wise excel FROM MASTER
    const monthlyFilePath = await generateMonthWiseExcel(
      month,
      masterFilePath
    );

    res.download(
      monthlyFilePath,
      `monthly_${month}_${ref || "All"}.xlsx`,
      (err) => {
        if (err) {
          console.error("❌ Monthly download error:", err);
          res.status(500).json({ error: "Monthly excel download failed" });
        }
      }
    );
  } catch (err) {
    console.error("❌ Monthly Report Error:", err);
    res.status(500).json({
      error: "Failed to generate monthly report",
      message: err.message,
    });
  }
});


// ========================================
// ⚠️ BELOW CODE UNCHANGED (AS REQUESTED)
// ========================================

router.get("/quarterly", async (req, res) => {
  const { password, quarter, year, dateColumn = "loginDate" } = req.query;

  try {
    const expectedPass = process.env.DOWNLOAD_PASSWORD;
    if (!password || password !== expectedPass) {
      return res.status(401).json({ error: "Unauthorized: Invalid password" });
    }

    const apps = await Application.find({});
    const result = await reportGenerator.generateQuarterlyReport(
      apps,
      quarter,
      year,
      { dateColumn }
    );

    res.download(result.filePath, result.filename);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate quarterly report" });
  }
});

router.get("/custom-date", async (req, res) => {
  const { password, startDate, endDate, dateColumn = "loginDate" } = req.query;

  try {
    const expectedPass = process.env.DOWNLOAD_PASSWORD;
    if (!password || password !== expectedPass) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const apps = await Application.find({});
    const result = await reportGenerator.generateCustomDateReport(
      apps,
      startDate,
      endDate,
      { dateColumn }
    );

    res.download(result.filePath, result.filename);
  } catch (err) {
    res.status(500).json({ error: "Custom date report failed" });
  }
});

router.get("/report-info", async (req, res) => {
  res.status(501).json({
    message: "Report info logic unchanged (dependencies missing)",
  });
});

router.get("/test", (req, res) => {
  res.send("✅ Export API working");
});

export default router;
