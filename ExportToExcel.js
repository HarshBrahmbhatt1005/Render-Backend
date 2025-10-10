import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

export default async function exportToExcel(apps, refName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applications");

  // 🔹 Define schema fields to include (hide "_id", "__v", and other* fields)
  let schemaPaths = Object.keys(Application.schema.paths).filter(
    (field) =>
      field !== "__v" &&
      field !== "_id" &&
      !field.startsWith("other") &&
      ![
        "consulting",
        "payout",
        "expenceAmount",
        "feesRefundAmount",
        "remark",
      ].includes(field) // these will be merged into Remarks
  );

  // 🔹 Add merged “Remarks” column at the end
  schemaPaths.push("remarksSummary");

  // 🔹 Setup Excel columns
  worksheet.columns = schemaPaths.map((key) => ({
    header:
      key === "remarksSummary"
        ? "Remarks (Team + Consulting + Payout + Refund)"
        : key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase()),
    key,
    width: 25,
  }));

  // 🔹 Populate rows
  apps.forEach((app) => {
    const row = {};

    schemaPaths.forEach((field) => {
      if (field === "bank")
        row[field] = app.bank === "Other" ? app.otherBank : app.bank;
      else if (field === "product")
        row[field] = app.product === "Other" ? app.otherProduct : app.product;
      else if (field === "code")
        row[field] = app.code === "Other" ? app.otherCode : app.code;
      else if (field === "loginDate" && app.loginDate)
        row[field] = new Date(app.loginDate).toLocaleDateString("en-IN");
      else if (field === "remarksSummary") {
        const consulting = app.consulting ? `Consulting: ${app.consulting}` : "";
        const payout = app.payout ? `Payout: ${app.payout}` : "";
        const exp = app.expenceAmount ? `Expense: ${app.expenceAmount}` : "";
        const refund = app.feesRefundAmount
          ? `Refund: ${app.feesRefundAmount}`
          : "";
        const remark = app.remark ? `Remark: ${app.remark}` : "";

        row[field] = [consulting, payout, exp, refund, remark]
          .filter(Boolean)
          .join(" | ");
      } else {
        row[field] = app[field];
      }
    });

    worksheet.addRow(row);
  });

  // 🔹 Style header row (Bold + Yellow background)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" }, // Yellow highlight
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // 🔹 Wrap text and add borders for all cells
  worksheet.eachRow((row) => {
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

  // 🔹 Save Excel file
  const exportDir = path.join("exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

  const fileName = `applications_${refName || "All"}.xlsx`;
  const filePath = path.join(exportDir, fileName);

  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Excel exported successfully: ${filePath}`);

  return filePath;
}
