import express from "express";
import Application from "../models/Application.js";
import ExcelJS from "exceljs";

const router = express.Router();

// Test endpoint to verify route is working
router.get("/test", (req, res) => {
  res.json({ 
    message: "Monthly export route is working",
    query: req.query,
    timestamp: new Date().toISOString()
  });
});

// Helper: format date to Indian format (DD-MM-YYYY)
function formatDateToIndian(date) {
  if (!date) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) return date;

  const d = new Date(date);
  if (isNaN(d)) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

// Helper: convert to number
function toNumber(val) {
  if (!val) return 0;
  return Number(val.toString().replace(/,/g, "")) || 0;
}

// Helper: merge remark fields
function formatMergedRemark(obj) {
  const remark = obj.remark || "N/A";
  const consulting = obj.consulting || "N/A";
  const payout = obj.payout || "N/A";
  const expense = obj.expenceAmount || "N/A";
  const feesRefund = obj.feesRefundAmount || "N/A";
  
  return `Remark: ${remark} | Consulting: ${consulting} | Payout: ${payout} | Expense: ${expense} | Fees Refund: ${feesRefund}`;
}

// Validate YYYY-MM format
function isValidMonthFormat(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

// GET /api/customer/monthly-excel?month=YYYY-MM&sales=SalesPersonName&password=xxx
// OR GET /api/customer/monthly-excel?month=YYYY-MM&password=xxx (for all sales)
router.get("/monthly-excel", async (req, res) => {
  try {
    let { month, sales, password } = req.query;

    // Sanitize month parameter (remove any extra characters)
    if (month) {
      month = month.trim().split(':')[0]; // Remove anything after colon
      month = month.replace(/[^\d-]/g, ''); // Keep only digits and hyphens
    }

    // Enhanced logging for debugging
    console.log("=== MONTHLY EXCEL REQUEST ===");
    console.log("Raw query params:", req.query);
    console.log("Sanitized month:", month);
    console.log("Sales:", sales);
    console.log("Password provided:", !!password);
    console.log("============================");

    // Validate month format
    if (!month) {
      return res.status(400).json({ 
        error: "Month parameter is required. Use YYYY-MM format (e.g., 2024-03)" 
      });
    }

    if (!isValidMonthFormat(month)) {
      return res.status(400).json({ 
        error: `Invalid month format: "${month}". Use YYYY-MM (e.g., 2024-03)` 
      });
    }

    // Validate password
    if (!password) {
      return res.status(400).json({ 
        error: "Password is required" 
      });
    }

    // If sales is provided, verify password for that specific sales person
    // If sales is not provided, use master password for all data
    let expectedPassword;
    let filterBySales = false;

    if (sales && sales.trim() !== "") {
      // Specific sales person - verify their password
      const envKey = `${(sales || "")
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "")
        .toUpperCase()}_PASSWORD`;

      expectedPassword = process.env[envKey];

      console.log("Looking for env key:", envKey);
      console.log("Password found in env:", !!expectedPassword);

      if (!expectedPassword) {
        return res.status(404).json({ 
          error: `No password configured for "${sales}". Please contact administrator.` 
        });
      }

      filterBySales = true;
    } else {
      // No sales specified - use master download password
      expectedPassword = process.env.DOWNLOAD_PASSWORD;

      if (!expectedPassword) {
        return res.status(404).json({ 
          error: "Master download password not configured. Please contact administrator." 
        });
      }
    }

    if (password !== expectedPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Parse month
    const [year, monthNum] = month.split("-");
    const startDate = new Date(year, parseInt(monthNum) - 1, 1);
    const endDate = new Date(year, parseInt(monthNum), 0, 23, 59, 59, 999);

    console.log("Date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Build query - filter by month and optionally by sales person
    const query = {
      $or: [
        // ISO date format stored as Date object
        {
          loginDate: {
            $gte: startDate,
            $lte: endDate
          }
        },
        // DD-MM-YYYY string format
        {
          loginDate: {
            $regex: new RegExp(`^\\d{2}-${monthNum}-${year}$`)
          }
        },
        // YYYY-MM-DD string format
        {
          loginDate: {
            $regex: new RegExp(`^${year}-${monthNum}-\\d{2}$`)
          }
        }
      ]
    };

    // Add sales filter if specified
    if (filterBySales && sales) {
      query.sales = sales;
    }

    console.log("Query:", JSON.stringify(query, null, 2));
    console.log("Filter by sales:", filterBySales);

    // Fetch filtered applications
    const apps = await Application.find(query).sort({ loginDate: 1 });

    console.log(`Found ${apps.length} records`);

    // Check if data exists
    if (!apps || apps.length === 0) {
      const salesInfo = filterBySales ? ` for ${sales}` : "";
      return res.status(404).json({ 
        error: `No data found${salesInfo} in ${month}` 
      });
    }

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Report");

    // Define headers (same as master Excel)
    const loginColumns = [
      "S.No",
      "Code",
      "Name",
      "Mobile",
      "Product",
      "Req Loan Amount",
      "Bank",
      "Banker Name",
      "Status",
      "Login Date",
      "Sales",
      "Ref",
      "Source Channel",
      "Email",
      "Property Type",
      "Property Details",
      "Remarks",
      "Category",
      "PD Status",
      "PD Remark",
      "PD Date",
      "Rejected Remark",
      "Withdraw Remark",
      "Hold Remark",
    ];

    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Loan Number",
      "Insurance Option",
      "Insurance Amount",
      "Subvention Option",
      "Subvention Amount",
      "Part Disbursed Details",
      "Total Part Disbursed Amount",
      "Remaining Amount",
      "Re-login Reason",
    ];

    const headers = [...loginColumns, "", "", ...disbursedColumns];

    // Add title row
    const titleText = filterBySales 
      ? `Monthly Report - ${sales} - ${month}` 
      : `Monthly Report - All Sales - ${month}`;
    const titleRow = sheet.addRow([titleText]);
    titleRow.font = { bold: true, size: 16 };
    sheet.mergeCells(`A${titleRow.number}:Z${titleRow.number}`);
    titleRow.alignment = { horizontal: "center" };
    sheet.addRow([]);

    // Add header row
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9C4" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Freeze header row
    sheet.views = [{ state: "frozen", ySplit: 3 }];

    // Add data rows
    apps.forEach((app, i) => {
      const obj = app.toObject ? app.toObject() : app;

      const loginData = [
        i + 1,
        obj.code === "Other" ? obj.otherCode : obj.code,
        obj.name,
        obj.mobile,
        obj.product === "Other" ? obj.otherProduct : obj.product,
        obj.amount,
        obj.bank === "Other" ? obj.otherBank : obj.bank,
        obj.bankerName,
        obj.status,
        formatDateToIndian(obj.loginDate),
        obj.sales,
        obj.ref,
        obj.sourceChannel === "Other"
          ? obj.otherSourceChannel
          : obj.sourceChannel,
        obj.email,
        obj.propertyType,
        obj.propertyDetails,
        formatMergedRemark(obj),
        obj.category === "Other" ? obj.otherCategory : obj.category,
        obj.pdStatus || "",
        obj.pdRemark || "",
        obj.pdDate ? formatDateToIndian(obj.pdDate) : "",
        obj.rejectedRemark || "",
        obj.withdrawRemark || "",
        obj.holdRemark || "",
      ];

      const partDetails = (obj.partDisbursed || [])
        .map(
          (p, idx) =>
            `Part-${idx + 1}: {Date: ${formatDateToIndian(
              p.date
            )}, Amount: ${p.amount}}`
        )
        .join(" | ");

      const totalPartAmount =
        obj.status === "Part Disbursed"
          ? (obj.partDisbursed || []).reduce(
              (sum, p) => sum + toNumber(p.amount),
              0
            )
          : "";

      const remainingAmount =
        obj.status === "Part Disbursed"
          ? toNumber(obj.sanctionAmount) - toNumber(totalPartAmount)
          : "";

      const disbursedData = [
        formatDateToIndian(obj.sanctionDate),
        obj.sanctionAmount,
        formatDateToIndian(obj.disbursedDate),
        obj.disbursedAmount,
        obj.loanNumber,
        obj.insuranceOption,
        obj.insuranceAmount,
        obj.subventionOption,
        obj.subventionAmount,
        partDetails,
        totalPartAmount,
        remainingAmount,
        obj.reloginReason,
      ];

      const row = sheet.addRow([...loginData, "", "", ...disbursedData]);
      
      // Apply borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", wrapText: true };
      });

      // Format part disbursed details column
      const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
      row.getCell(partColIndex).alignment = { wrapText: true };

      // Format remarks column
      const remarksColIndex = headers.indexOf("Remarks") + 1;
      row.getCell(remarksColIndex).alignment = { wrapText: true };

      // Format currency columns
      if (totalPartAmount !== "") {
        row.getCell(headers.indexOf("Total Part Disbursed Amount") + 1).numFmt =
          "₹#,##0.00";
        row.getCell(headers.indexOf("Remaining Amount") + 1).numFmt =
          "₹#,##0.00";
      }
    });

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      let max = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > max) max = len;
      });
      column.width = Math.min(max + 2, 50);
    });

    // Set specific widths for long content columns
    const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
    sheet.getColumn(partColIndex).width = 60;
    
    const remarksColIndex = headers.indexOf("Remarks") + 1;
    sheet.getColumn(remarksColIndex).width = 80;

    // Set response headers for file download
    const filenameSales = filterBySales ? sales.replace(/\s+/g, "_") : "All_Sales";
    const filename = `Customer_Report_${filenameSales}_${month}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    // Write to response stream (no file saved on server)
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Monthly Excel Export Error:", err);
    console.error("Error stack:", err.stack);
    
    // Send detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({ 
      error: "Failed to generate monthly report",
      details: isDevelopment ? err.message : undefined,
      stack: isDevelopment ? err.stack : undefined
    });
  }
});

export default router;
