import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

// ===== Helper Functions =====
function formatDateToIndian(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function autoFitColumns(sheet) {
  sheet.columns.forEach((column) => {
    let max = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > max) max = len;
    });
    column.width = max + 2;
  });
}

// ===== Main Export Function =====
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ========================= MASTER EXCEL =========================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // --- Headings ---
    masterSheet.mergeCells("A1:R1");
    masterSheet.getCell("A1").value = "Login Details";
    masterSheet.getCell("A1").font = { bold: true, size: 16 };
    masterSheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    masterSheet.mergeCells("U1:Z1"); // 2-column gap (S, T)
    masterSheet.getCell("U1").value = "Disbursed Details";
    masterSheet.getCell("U1").font = { bold: true, size: 16 };
    masterSheet.getCell("U1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    const loginColumns = [
      "S.No",
      "Code",
      "Name",
      "Mobile",
      "Product",
      "Amount",
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
      "Remarks (Team + Consulting + Payout + Refund)",
      "Category",
    ];

    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Loan Number",
      "Insurance Option",
      "Insurance Amount",
      "Part Disbursed Details",
    ];

    const masterHeaders = [...loginColumns, "", "", ...disbursedColumns];
    const masterHeaderRow = masterSheet.addRow(masterHeaders);

    // --- Header Style ---
    masterHeaderRow.eachCell((cell) => {
      if (cell.value === "") return;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9C4" }, // Light yellow
      };
    });

    // --- Data ---
    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const loginData = [
        index + 1,
        obj.code === "Other" ? obj.otherCode || "" : obj.code || "",
        obj.name || "",
        obj.mobile || "",
        obj.product === "Other" ? obj.otherProduct || "" : obj.product || "",
        obj.amount || "",
        obj.bank === "Other" ? obj.otherBank || "" : obj.bank || "",
        obj.bankerName || "",
        obj.status || "",
        formatDateToIndian(obj.loginDate),
        obj.sales || "",
        obj.ref || "",
        obj.sourceChannel === "Other"
          ? obj.otherSourceChannel || ""
          : obj.sourceChannel || "",
        obj.email || "",
        obj.propertyType || "",
        obj.propertyDetails || "",
        [
          obj.consulting ? `Consulting: ${obj.consulting}` : "",
          obj.payout ? `Payout: ${obj.payout}` : "",
          obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
          obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
          obj.remark ? `Remark: ${obj.remark}` : "",
        ]
        .filter(Boolean)
        .join(" | "),
        obj.category === "Other" ? obj.otherCategory || "" : obj.category || "",
      ];

      const partDetails = (obj.partDisbursed || [])
        .map(
          (p, i) =>
            `Part-${i + 1}: {Date: ${formatDateToIndian(p.date)}, Amount: ${
              p.amount || 0
            }}`
        )
        .join(" | ");

      const disbursedData = [
        formatDateToIndian(obj.sanctionDate),
        obj.sanctionAmount || "",
        formatDateToIndian(obj.disbursedDate),
        obj.disbursedAmount || "",
        obj.loanNumber || "",
        obj.insuranceOption || "",
        obj.insuranceAmount || "",
        partDetails || "",
      ];

      const row = [...loginData, "", "", ...disbursedData];
      masterSheet.addRow(row);
    });

    autoFitColumns(masterSheet);

    const masterFile = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );
    await masterWorkbook.xlsx.writeFile(masterFile);

    // ========================= SALES EXCEL =========================
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales Report");

    // --- Headers ---
    const allKeys = [
      "S.No",
      ...Object.keys(apps[0].toObject ? apps[0].toObject() : apps[0]),
    ];

    const salesHeader = salesSheet.addRow(allKeys);
    salesHeader.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9C4" },
      };
    });

    // --- Data ---
    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      // Convert all dates in this sheet too
      const convertedObj = { ...obj };
      ["loginDate", "sanctionDate", "disbursedDate"].forEach((key) => {
        if (convertedObj[key]) {
          convertedObj[key] = formatDateToIndian(convertedObj[key]);
        }
      });

      const values = [index + 1, ...Object.values(convertedObj)];
      salesSheet.addRow(values);
    });

    autoFitColumns(salesSheet);

    const salesFile = path.join(
      exportDir,
      `Sales_${refName || "All"}_${timestamp}.xlsx`
    );
    await salesWorkbook.xlsx.writeFile(salesFile);

    // --- Return both paths ---
    return { masterFilePath: masterFile, salesFilePath: salesFile };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}
