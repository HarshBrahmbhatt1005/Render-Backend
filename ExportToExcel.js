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

// ===== MAIN EXPORT =====
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

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

    const headers = [...loginColumns, ...disbursedColumns];

    // ===== HEADER ROW =====
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E7F3FF" },
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ===== DATA ROWS =====
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
      ];

      // ✅ PART DISBURSED TABLE FORMAT (INSIDE CELL)
      const partDetails =
        obj.partDisbursed && obj.partDisbursed.length
          ? [
              "Part | Date       | Amount",
              "---------------------------",
              ...obj.partDisbursed.map(
                (p, idx) =>
                  `${idx + 1}    | ${formatDateToIndian(p.date)} | ${p.amount}`
              ),
            ].join("\n")
          : "";

      const totalPartAmount =
        obj.status === "Part Disbursed"
          ? obj.partDisbursed.reduce(
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

      const row = sheet.addRow([...loginData, ...disbursedData]);

      // ===== ALIGNMENTS =====
      const partColIndex = headers.indexOf("Part Disbursed Details") + 1;
      row.getCell(partColIndex).alignment = {
        wrapText: true,
        vertical: "top",
        horizontal: "left",
      };

      [
        "Sanction Date",
        "Disbursed Date",
        "Insurance Option",
        "Subvention Option",
      ].forEach((col) => {
        const idx = headers.indexOf(col) + 1;
        row.getCell(idx).alignment = { horizontal: "center" };
      });

      [
        "Sanction Amount",
        "Disbursed Amount",
        "Total Part Disbursed Amount",
        "Remaining Amount",
      ].forEach((col) => {
        const idx = headers.indexOf(col) + 1;
        row.getCell(idx).alignment = { horizontal: "right" };
        row.getCell(idx).numFmt = "₹#,##0.00";
      });
    });

    // ===== COLUMN WIDTHS =====
    sheet.columns.forEach((col, i) => {
      col.width =
        headers[i] === "Part Disbursed Details"
          ? 45
          : headers[i].includes("Amount")
          ? 18
          : 16;
    });

    const filePath = path.join(
      exportDir,
      `Master_${refName || "All"}_${Date.now()}.xlsx`
    );

    await workbook.xlsx.writeFile(filePath);
    return { masterFilePath: filePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}
