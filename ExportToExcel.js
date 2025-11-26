import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

// ===== Helper Functions =====
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

    // ========================= HEADER COLUMNS =========================
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
    // ===== REMAINING AMOUNT LOGIC =====
const totalLoan = Number(obj.amount) || 0;

// Auto-calc total part disbursed amount
let totalPartDisbursed = 0;

if (Array.isArray(obj.partDisbursed)) {
  obj.partDisbursed.forEach((p) => {
    totalPartDisbursed += Number(p.amount) || 0;
  });
}

const remainingAmount =
  totalPartDisbursed > 0 ? totalLoan - totalPartDisbursed : "";

// ===== DISBURSED DATA WITH REMAINING AMOUNT =====
const disbursedData = [
  formatDateToIndian(obj.sanctionDate),
  obj.sanctionAmount,
  formatDateToIndian(obj.disbursedDate),
  obj.disbursedAmount,
  obj.loanNumber,
  obj.insuranceOption,
  obj.insuranceAmount,
  partDetails,
  remainingAmount, // ⭐ NEW COLUMN HERE
];

// ADD ROW TO MASTER
masterSheet.addRow([...loginData, "", "", ...disbursedData]);


    // ========================= 🟦 PART DISBURSED TABLE (TOP) =========================
    const partData = apps.filter(
      (a) =>
        (a.status || "").toString().trim().toLowerCase() ===
        "part disbursed"
    );

    if (partData.length > 0) {
      const titleRow = masterSheet.addRow(["PART DISBURSED CASES"]);
      titleRow.font = { bold: true, size: 16 };
      masterSheet.mergeCells(`A${titleRow.number}:Z${titleRow.number}`);

      masterSheet.addRow([]);

      // Add headers
      const hdr = masterSheet.addRow(masterHeaders);
      hdr.eachCell((cell) => {
        if (!cell.value) return;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Add rows
      partData.forEach((app, i) => {
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
          obj.sourceChannel === "Other" ? obj.otherSourceChannel : obj.sourceChannel,
          obj.email,
          obj.propertyType,
          obj.propertyDetails,
          [
            obj.consulting ? `Consulting: ${obj.consulting}` : "",
            obj.payout ? `Payout: ${obj.payout}` : "",
            obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
            obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
            obj.remark ? `Remark: ${obj.remark}` : "",
          ].filter(Boolean).join(" | "),
          obj.category === "Other" ? obj.otherCategory : obj.category,
        ];

        const partDetails = (obj.partDisbursed || [])
          .map((p, idx) => `Part-${idx + 1}: {Date: ${formatDateToIndian(p.date)}, Amount: ${p.amount}}`)
          .join(" | ");

        const disbursedData = [
          formatDateToIndian(obj.sanctionDate),
          obj.sanctionAmount,
          formatDateToIndian(obj.disbursedDate),
          obj.disbursedAmount,
          obj.loanNumber,
          obj.insuranceOption,
          obj.insuranceAmount,
          partDetails,
        ];

        masterSheet.addRow([...loginData, "", "", ...disbursedData]);
      });

      masterSheet.addRow([]);
      masterSheet.addRow([]);
    }

    // ========================= 🟨 MAIN MASTER TITLE = MASTER DATA =========================
    const mainTitle = masterSheet.addRow(["MASTER DATA"]);
    mainTitle.font = { bold: true, size: 16 };
    masterSheet.mergeCells(`A${mainTitle.number}:Z${mainTitle.number}`);

    masterSheet.addRow([]);

    // Main master header
    const mainHdr = masterSheet.addRow(masterHeaders);

    mainHdr.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9C4" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ========================= 🟨 MASTER DATA ROWS =========================
    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const loginData = [
        index + 1,
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
        obj.sourceChannel === "Other" ? obj.otherSourceChannel : obj.sourceChannel,
        obj.email,
        obj.propertyType,
        obj.propertyDetails,
        [
          obj.consulting ? `Consulting: ${obj.consulting}` : "",
          obj.payout ? `Payout: ${obj.payout}` : "",
          obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
          obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
          obj.remark ? `Remark: ${obj.remark}` : "",
        ].filter(Boolean).join(" | "),
        obj.category === "Other" ? obj.otherCategory : obj.category,
      ];

      const partDetails = (obj.partDisbursed || [])
        .map((p, i) => `Part-${i + 1}: {Date: ${formatDateToIndian(p.date)}, Amount: ${p.amount}}`)
        .join(" | ");

      const disbursedData = [
        formatDateToIndian(obj.sanctionDate),
        obj.sanctionAmount,
        formatDateToIndian(obj.disbursedDate),
        obj.disbursedAmount,
        obj.loanNumber,
        obj.insuranceOption,
        obj.insuranceAmount,
        partDetails,
      ];

      masterSheet.addRow([...loginData, "", "", ...disbursedData]);
    });

    autoFitColumns(masterSheet);

    const masterFile = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );

    await masterWorkbook.xlsx.writeFile(masterFile);

    // ========================= SALES FILE (NO CHANGE) =========================
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales Report");

    const allKeys = ["S.No", ...Object.keys(apps[0].toObject ? apps[0].toObject() : apps[0])];

    const salesHeader = salesSheet.addRow(allKeys);
    salesHeader.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9C4" } };
    });

    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const converted = { ...obj };
      ["loginDate", "sanctionDate", "disbursedDate"].forEach((key) => {
        if (converted[key]) converted[key] = formatDateToIndian(converted[key]);
      });

      salesSheet.addRow([index + 1, ...Object.values(converted)]);
    });

    autoFitColumns(salesSheet);

    const salesFile = path.join(
      exportDir,
      `Sales_${refName || "All"}_${timestamp}.xlsx`
    );

    await salesWorkbook.xlsx.writeFile(salesFile);

    return { masterFilePath: masterFile, salesFilePath: salesFile };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}
