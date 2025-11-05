import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

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
      "Name",
      "Code",
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

    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
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
        fgColor: { argb: "FFF9C4" },
      }; // Light yellow
    });

    // --- Data ---
    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const loginData = [
        index + 1,
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
        obj.ref || "",
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

      // const disbursedData = [
      //   formatDate(obj.sanctionDate),
      //   obj.sanctionAmount || "",
      //   formatDate(obj.disbursedDate),
      //   obj.disbursedAmount || "",
      //   obj.insuranceOption || "",
      //   obj.insuranceAmount || "",
      // ];
      const partDetails = (obj.partDisbursed || [])
        .map(
          (p, i) =>
            `Part-${i + 1}: {Date: ${formatDate(p.date)}, Amount: ${
              p.amount || 0
            }}`
        )
        .join(" | ");

      const disbursedData = [
        formatDate(obj.sanctionDate),
        obj.sanctionAmount || "",
        formatDate(obj.disbursedDate),
        obj.disbursedAmount || "",
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
      const values = [index + 1, ...Object.values(obj)];
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

// ===== Helper Functions =====
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

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
