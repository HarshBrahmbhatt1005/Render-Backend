import ExcelJS from "exceljs";
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

function toNumber(val) {
  if (!val) return 0;
  return Number(val.toString().replace(/,/g, "")) || 0;
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

// ===== MAIN EXPORT =====
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Master");

    // ===== HEADERS =====
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

    // ================= PART DISBURSED CASES =================
    const partCases = apps.filter(
      (a) => (a.status || "").toLowerCase() === "part disbursed"
    );

    if (partCases.length) {
      const title = sheet.addRow(["PART DISBURSED CASES"]);
      title.font = { bold: true, size: 16 };
      sheet.mergeCells(`A${title.number}:Z${title.number}`);
      sheet.addRow([]);

      const hdr = sheet.addRow(headers);
      hdr.eachCell((cell) => {
        if (!cell.value) return;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D9E1F2" },
        };
      });

      partCases.forEach((app, i) => {
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
          obj.remark,
          obj.category === "Other" ? obj.otherCategory : obj.category,
          obj.pdStatus || "",
          obj.pdRemark || "",
        ];

        const partDetails = (obj.partDisbursed || [])
          .map(
            (p, idx) =>
              `Part-${idx + 1}: {Date: ${formatDateToIndian(
                p.date
              )}, Amount: ${p.amount}}`
          )
          .join(" | ");

        const totalPartAmount = (obj.partDisbursed || []).reduce(
          (sum, p) => sum + toNumber(p.amount),
          0
        );

        const remainingAmount =
          toNumber(obj.sanctionAmount) - totalPartAmount;

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
       // ✅ Wrap text for part disbursed details
        const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
        row.getCell(partColIndex).alignment = { wrapText: true };
        row.getCell(headers.indexOf("Total Part Disbursed Amount") + 1).numFmt =
          "₹#,##0.00";
        row.getCell(headers.indexOf("Remaining Amount") + 1).numFmt =
          "₹#,##0.00";
      });

      sheet.addRow([]);
      sheet.addRow([]);
    }

    // ================= MASTER DATA =================
    const masterTitle = sheet.addRow(["MASTER DATA"]);
    masterTitle.font = { bold: true, size: 16 };
    sheet.mergeCells(`A${masterTitle.number}:Z${masterTitle.number}`);
    sheet.addRow([]);

    const mainHdr = sheet.addRow(headers);
    mainHdr.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9C4" },
      };
    });

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
        obj.remark,
        obj.category === "Other" ? obj.otherCategory : obj.category,
        obj.pdStatus || "",
        obj.pdRemark || "",
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
 const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
      row.getCell(partColIndex).alignment = { wrapText: true };
      if (totalPartAmount !== "") {
        row.getCell(headers.indexOf("Total Part Disbursed Amount") + 1).numFmt =
          "₹#,##0.00";
        row.getCell(headers.indexOf("Remaining Amount") + 1).numFmt =
          "₹#,##0.00";
      }
    });

    autoFitColumns(sheet);
        // ✅ FIX WIDTH FOR PART DISBURSED DETAILS COLUMN
    const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
    sheet.getColumn(partColIndex).width = 150;

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
