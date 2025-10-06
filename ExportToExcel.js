import ExcelJS from "exceljs";
import Application from "./models/Application.js";

export default async function exportToExcel(apps, refName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applications");

  // 🔹 Auto-read columns from schema dynamically
  const schemaPaths = Object.keys(Application.schema.paths).filter(
    (field) => field !== "__v" && field !== "_id"
  );

  worksheet.columns = schemaPaths.map((key) => ({
    header: key.charAt(0).toUpperCase() + key.slice(1),
    key,
    width: 20,
  }));

  apps.forEach((app) => {
    const row = {};
    schemaPaths.forEach((field) => {
      row[field] = app[field];
    });
    worksheet.addRow(row);
  });

  const fileName = `applications_${refName}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  console.log(`✅ Excel updated: ${fileName}`);
  return fileName;
}
