import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Master");

    // ======= LOGIN HEADING =======
    sheet.mergeCells("A1:R1"); // include Serial No
    sheet.getCell("A1").value = "Login Details";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // ======= DISBURSED HEADING =======
    sheet.mergeCells("U1:Z1"); // gap of 2 blank columns (S, T)
    sheet.getCell("U1").value = "Disbursed Details";
    sheet.getCell("U1").font = { bold: true, size: 16 };
    sheet.getCell("U1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // ======= LOGIN COLUMNS =======
    const loginColumns = [
      "S.No", // ✅ Serial number
      "Code",
      "Name",
      "Mobile",
      "Email",
      "Product",
      "Amount",
      "Bank",
      "Banker Name",
      "Status",
      "Login Date",
      "Sales",
      "Ref",
      "Source Channel",
      "Property Type",
      "Property Details",
      "Category",
      "Remarks (Team + Consulting + Payout + Refund)",
    ];

    // ======= DISBURSED COLUMNS =======
    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Insurance Option",
      "Insurance Amount",
    ];

    // combine columns with 2 blank gap
    const allHeaders = [...loginColumns, "", "", ...disbursedColumns];

    const headerRow = sheet.addRow(allHeaders);

    // ======= Header Styling =======
    headerRow.eachCell((cell) => {
      if (cell.value === "") return; // skip blank gap
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
        fgColor: { argb: "ffeb3b" },
      };
    });

    // ======= DATA ROWS =======
    apps.forEach((app, index) => {
      const obj = app.toObject();

      const loginPart = [
        index + 1, // serial
        obj.code === "Other" ? obj.otherCode || "" : obj.code || "",
        obj.name || "",
        obj.mobile || "",
        obj.email || "",
        obj.product === "Other" ? obj.otherProduct || "" : obj.product || "",
        obj.amount || "",
        obj.bank === "Other" ? obj.otherBank || "" : obj.bank || "",
        obj.bankerName || "",
        obj.status || "",
        formatDate(obj.loginDate),
        obj.sales || "",
        obj.refName || "",
        obj.sourceChannel === "Other"
          ? obj.otherSourceChannel || ""
          : obj.sourceChannel || "",
        obj.propertyType || "",
        obj.propertyDetails || "",
        obj.category === "Other" ? obj.otherCategory || "" : obj.category || "",
        [
          obj.consulting ? `Consulting: ${obj.consulting}` : "",
          obj.payout ? `Payout: ${obj.payout}` : "",
          obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
          obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
          obj.remark ? `Remark: ${obj.remark}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      ];

      const disbursedPart = [
        formatDate(obj.sanctionDate),
        obj.sanctionAmount || "",
        formatDate(obj.disbursedDate),
        obj.disbursedAmount || "",
        obj.insuranceOption || "",
        obj.insuranceAmount || "",
      ];

      const rowData = [...loginPart, "", "", ...disbursedPart];
      sheet.addRow(rowData);
    });

    // ======= Auto Fit Columns =======
    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, val.length);
      });
      column.width = maxLength + 2; // auto-adjust + small padding
    });

    // ======= Save File =======
    const filePath = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );
    await workbook.xlsx.writeFile(filePath);

    return { masterFilePath: filePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}
// ===================== SALES =====================
const salesWorkbook = new ExcelJS.Workbook();
const salesSheet = salesWorkbook.addWorksheet("Sales");

// Get all fields dynamically from Mongoose schema
const allFields = Object.keys(Application.schema.paths);

// Add Serial No column first
const salesColumns = [
  { header: "Serial No", key: "serialNo" },
  ...allFields.map((key) => ({
    header: key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase()),
    key,
  })),
];

salesSheet.columns = salesColumns;

// Fill data rows
apps.forEach((app, index) => {
  const row = {};
  const obj = app.toObject();

  row.serialNo = index + 1;
  allFields.forEach((key) => {
    let value = obj[key];

    // Format date fields
    if (key.toLowerCase().includes("date") && value) {
      value = formatDate(value);
    }

    // Handle nested or missing
    if (value === undefined || value === null) value = "";

    row[key] = value;
  });

  salesSheet.addRow(row);
});

// ===================== Styling =====================
const headerRow = salesSheet.getRow(1);
headerRow.font = { bold: true };
headerRow.eachCell((cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF00" },
  };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});

// Apply border & wrap for all cells
salesSheet.eachRow((row, rowNumber) => {
  row.eachCell((cell) => {
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
});

// Adjust column width automatically based on content
salesSheet.columns.forEach((col) => {
  let maxLength = 10;
  col.eachCell({ includeEmpty: true }, (cell) => {
    const cellLength = cell.value ? cell.value.toString().length : 0;
    if (cellLength > maxLength) maxLength = cellLength;
  });
  col.width = maxLength + 2;
});

const salesFilePath = path.join(
  exportDir,
  `Sales_${refName || "All"}_${timestamp}.xlsx`
);
await salesWorkbook.xlsx.writeFile(salesFilePath);

// ======= Helper: Format Date =======
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  let mm = d.getMonth() + 1;
  let dd = d.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  return `${yyyy}-${mm}-${dd}`;
}
