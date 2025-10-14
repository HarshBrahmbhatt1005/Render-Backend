import ExcelJS from "exceljs";
import BuilderVisitData from "./models/BuilderVisitData.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";


export default async function exportBuilderVisits(refName = "All") {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // Fetch all builder visits
    const visits = await BuilderVisitData.find().sort({ createdAt: -1 });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    // Dynamically set columns (except __v, _id, timestamps)
    const excludeFields = ["_id", "__v", "createdAt", "updatedAt"];
    const columns = Object.keys(BuilderVisitData.schema.paths)
      .filter(k => !excludeFields.includes(k))
      .map(k => ({
        header: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        key: k,
        width: 25,
      }));

    sheet.columns = columns;

    // Add rows
    visits.forEach(v => {
      const obj = v.toObject();
      const row = {};
      Object.keys(obj).forEach(k => {
        if (!excludeFields.includes(k)) {
          if (obj[k] instanceof Date || k.toLowerCase().includes("date")) {
            row[k] = formatDate(obj[k]);
          } else {
            row[k] = obj[k] ?? "";
          }
        }
      });
      sheet.addRow(row);
    });

    styleSheet(sheet);

    const filePath = path.join(exportDir, `Builder_Visits_${refName}_${timestamp}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;

  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

// ========== Helper ==========
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function styleSheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  sheet.eachRow((row, i) => {
    if (i === 1) return;
    row.eachCell(cell => {
      cell.alignment = { wrapText: true, vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });
}
