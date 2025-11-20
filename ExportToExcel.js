import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

// ========================= Loan Summary =========================
function computeLoanSummary(obj) {
  const sanction = Number(obj.sanctionAmount || 0);

  const totalPart = (obj.partDisbursed || []).reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const pending = sanction - totalPart;

  return { sanction, totalPart, pending };
}

// ========================= Date Formatter =========================
function formatDateToIndian(date) {
  if (!date) return "";

  // If already in DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) return date;

  const d = new Date(date);
  if (isNaN(d)) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

// ========================= Auto-fit Columns =========================
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

// ========================= MAIN EXPORT FUNCTION =========================
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();


    // === Summary Row ===
// === Summary Row (A, B, C, D side-by-side) ===
const summaryRow = masterSheet.addRow([
  "Loan Summary",                         // A
  `Sanction: ${summary.sanction}`,        // B
  `Total Part: ${summary.totalPart}`,     // C
  `Pending: ${summary.pending}`,          // D
  ...Array( masterSheet.columns.length - 4 ).fill("")  // E → last empty
]);

summaryRow.font = { bold: true };

summaryRow.eachCell((c) => {
  c.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFCC" }
  };
  c.alignment = { horizontal: "center" };
});



    // ---------------------------------------------------------------
    // ========================= MASTER FILE =========================
    // ---------------------------------------------------------------
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // --- Section Headers ---
    masterSheet.mergeCells("A1:R1");
    masterSheet.getCell("A1").value = "Login Details";
    masterSheet.getCell("A1").font = { bold: true, size: 16 };
    masterSheet.getCell("A1").alignment = { horizontal: "center" };

    masterSheet.mergeCells("U1:Z1");
    masterSheet.getCell("U1").value = "Disbursed Details";
    masterSheet.getCell("U1").font = { bold: true, size: 16 };
    masterSheet.getCell("U1").alignment = { horizontal: "center" };

    // --- Column Headers ---
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
      "Remarks",
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

    masterHeaderRow.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9C4" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // --- DATA Rows ---
    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const summary = computeLoanSummary(obj);

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

      const partDetails =
        (obj.partDisbursed || [])
          .map(
            (p, i) =>
              `Part-${i + 1}: { Date: ${formatDateToIndian(p.date)}, Amount: ${
                p.amount || 0
              } }`
          )
          .join(" | ") || "";

      const disbursedData = [
        formatDateToIndian(obj.sanctionDate),
        obj.sanctionAmount || "",
        formatDateToIndian(obj.disbursedDate),
        obj.disbursedAmount || "",
        obj.loanNumber || "",
        obj.insuranceOption || "",
        obj.insuranceAmount || "",
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

    // ---------------------------------------------------------------
    // ========================= SALES FILE =========================
    // ---------------------------------------------------------------
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales Report");

    const allKeys = [
      "S.No",
      ...Object.keys(apps[0].toObject ? apps[0].toObject() : apps[0]),
    ];

    const salesHeaderRow = salesSheet.addRow(allKeys);
    salesHeaderRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9C4" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    apps.forEach((app, i) => {
      const obj = app.toObject ? app.toObject() : app;

      const convertedObj = { ...obj };
      ["loginDate", "sanctionDate", "disbursedDate"].forEach((d) => {
        if (convertedObj[d]) convertedObj[d] = formatDateToIndian(convertedObj[d]);
      });

      salesSheet.addRow([i + 1, ...Object.values(convertedObj)]);
    });

    autoFitColumns(salesSheet);

    const salesFile = path.join(
      exportDir,
      `Sales_${refName || "All"}_${timestamp}.xlsx`
    );
    await salesWorkbook.xlsx.writeFile(salesFile);

    return { masterFilePath: masterFile, salesFilePath: salesFile };
  } catch (err) {
    console.error("❌ Excel Export failed:", err);
    throw err;
  }
}
