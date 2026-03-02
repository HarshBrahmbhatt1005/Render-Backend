// import ExcelJS from "exceljs";
// import BuilderVisitData from "./models/BuilderVisitData.js";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";


// export default async function exportBuilderVisits(refName = "All") {
//   try {
//     const exportDir = path.join(process.cwd(), "exports");
//     if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

//     const timestamp = Date.now();

//     // Fetch all builder visits
//     const visits = await BuilderVisitData.find().sort({ createdAt: -1 });

//     // Create workbook
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Builder Visits");

//     // Dynamically set columns (except __v, _id, timestamps)
//     const excludeFields = ["_id", "__v", "createdAt", "updatedAt"];
//     const columns = Object.keys(BuilderVisitData.schema.paths)
//       .filter(k => !excludeFields.includes(k))
//       .map(k => ({
//         header: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
//         key: k,
//         width: 25,
//       }));

//     sheet.columns = columns;

//     // Add rows
//     visits.forEach(v => {
//       const obj = v.toObject();
//       const row = {};
//       Object.keys(obj).forEach(k => {
//         if (!excludeFields.includes(k)) {
//           if (obj[k] instanceof Date || k.toLowerCase().includes("date")) {
//             row[k] = formatDate(obj[k]);
//           } else {
//             row[k] = obj[k] ?? "";
//           }
//         }
//       });
//       sheet.addRow(row);
//     });

//     styleSheet(sheet);

//     const filePath = path.join(exportDir, `Builder_Visits_${refName}_${timestamp}.xlsx`);
//     await workbook.xlsx.writeFile(filePath);

//     return filePath;

//   } catch (err) {
//     console.error("❌ Excel export failed:", err);
//     throw err;
//   }
// }

// // ========== Helper ==========
// function formatDate(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// }

// function styleSheet(sheet) {
//   const headerRow = sheet.getRow(1);
//   headerRow.font = { bold: true };
//   headerRow.eachCell(cell => {
//     cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
//     cell.alignment = { vertical: "middle", horizontal: "center" };
//     cell.border = {
//       top: { style: "thin" },
//       left: { style: "thin" },
//       bottom: { style: "thin" },
//       right: { style: "thin" }
//     };
//   });

//   sheet.eachRow((row, i) => {
//     if (i === 1) return;
//     row.eachCell(cell => {
//       cell.alignment = { wrapText: true, vertical: "middle" };
//       cell.border = {
//         top: { style: "thin" },
//         left: { style: "thin" },
//         bottom: { style: "thin" },
//         right: { style: "thin" }
//       };
//     });
//   });
// }
import ExcelJS from "exceljs";
import BuilderVisitData from "./models/BuilderVisitData.js";
import fs from "fs";
import path from "path";

// =============================
// EXPORT FUNCTION
// =============================
export default async function exportBuilderVisits(refName = "Approved") {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ✅ ONLY LEVEL 2 APPROVED RECORDS
    const visits = await BuilderVisitData.find({
      "approval.level2.status": "Approved"
    }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Builder Visits");

    // =============================
    // FIXED COLUMN SEQUENCE
    // =============================
    const columnConfig = [
      { header: "Developer Group Name", key: "groupName" },
      { header: "Project Name", key: "projectName" },
      { header: "Developer Name", key: "builderName" },
      { header: "Developer Number", key: "builderNumber" },
      { header: "Location", key: "location" },
      { header: "Office Person Name", key: "officePersonDetails" },
      { header: "Office Person Number", key: "officePersonNumber" },
      { header: "Date Of Visit", key: "dateOfVisit" },
      { header: "Business Type", key: "businessType" },
      { header: "Executives", key: "executives" },
      { header: "Loan Account Number", key: "loanAccountNumber" },
      { header: "Stage Of Construction", key: "stageOfConstruction" },
      { header: "Development Type", key: "developmentType" },
      { header: "Area Type", key: "areaType" },
      { header: "Total Units / Blocks", key: "totalUnitsBlocks" },
      { header: "Total Blocks", key: "totalBlocks" },
      { header: "Property Sizes", key: "propertySizes" },
      { header: "Expected Completion", key: "expectedCompletionDate" },
      { header: "Negotiable", key: "negotiable" },
      { header: "Financing Requirements", key: "financingRequirements" },
      { header: "Resident Type", key: "residentType" },
      { header: "Nearby Projects", key: "nearbyProjects" },
      { header: "Surrounding Community", key: "surroundingCommunity" },
      { header: "Enquiry Type", key: "enquiryType" },
      { header: "Units For Sale", key: "unitsForSale" },
      { header: "Time Limit (Months)", key: "timeLimitMonths" },
      { header: "Remark", key: "remark" },
      { header: "Payout", key: "payout" },
      { header: "Sai Fakira Manager", key: "saiFakiraManager" },
      { header: "Approval Status", key: "approvalStatus" },

      // Level 1
      { header: "Level 1 Status", key: "level1Status" },
      { header: "Level 1 By", key: "level1By" },
      { header: "Level 1 At", key: "level1At" },
      { header: "Level 1 Comment", key: "level1Comment" },

      // Level 2
      { header: "Level 2 Status", key: "level2Status" },
      { header: "Level 2 By", key: "level2By" },
      { header: "Level 2 At", key: "level2At" },
      { header: "Level 2 Comment", key: "level2Comment" },

      // New fields
      { header: "USPs", key: "usps" },
      { header: "Total Amenities", key: "totalAmenities" },
      { header: "Allotted Car Parking", key: "allotedCarParking" },
      
      // Dynamic floor height columns
      { header: "Clear Floor Height", key: "clearFloorHeight" },
      { header: "Retail Floor Height", key: "clearFloorHeightRetail" },
      { header: "Flats Floor Height", key: "clearFloorHeightFlats" },
      { header: "Offices Floor Height", key: "clearFloorHeightOffices" },
    ];

    sheet.columns = columnConfig.map(col => ({
      header: col.header,
      key: col.key,
      width: 25
    }));

    // =============================
    // ADD DATA ROWS
    // =============================
    visits.forEach(v => {
      const obj = v.toObject();

      sheet.addRow({
        builderName: obj.builderName || "",
        builderNumber: obj.builderNumber || "",
        groupName: obj.groupName || "",
        projectName: obj.projectName || "",
        location: obj.location || "",
        dateOfVisit: formatDate(obj.dateOfVisit),
        businessType: obj.businessType || "",
        officePersonDetails: obj.officePersonDetails || "",
        officePersonNumber: obj.officePersonNumber || "",

        executives: obj.executives?.length
          ? obj.executives.map(e => `${e.name} (${e.number})`).join(", ")
          : "",

        loanAccountNumber: obj.loanAccountNumber || "",
        saiFakiraManager: obj.saiFakiraManager || "",
        stageOfConstruction: obj.stageOfConstruction || "",
        developmentType: obj.developmentType || "",
        areaType: obj.areaType || "",
        totalUnitsBlocks: obj.totalUnitsBlocks || "",
        totalBlocks: obj.totalBlocks || "",

        propertySizes: obj.propertySizes?.length
          ? obj.propertySizes.map(p =>
              `Size:${p.size}, Floor:${p.floor}, Sqft:${p.sqft}, Rate:${p.basicRate}`
            ).join(" | ")
          : "",

        expectedCompletionDate: obj.expectedCompletionDate || "",
        negotiable: obj.negotiable || "",
        financingRequirements: obj.financingRequirements || "",
        residentType: obj.residentType || "",
        nearbyProjects: obj.nearbyProjects || "",
        surroundingCommunity: obj.surroundingCommunity || "",
        enquiryType: obj.enquiryType || "",
        unitsForSale: obj.unitsForSale || "",
        timeLimitMonths: obj.timeLimitMonths || "",
        remark: obj.remark || "",
        payout: obj.payout || "",
        approvalStatus: obj.approvalStatus || "",

        level1Status: obj.approval?.level1?.status || "",
        level1By: obj.approval?.level1?.by || "",
        level1At: formatDate(obj.approval?.level1?.at),
        level1Comment: obj.approval?.level1?.comment || "",

        level2Status: obj.approval?.level2?.status || "",
        level2By: obj.approval?.level2?.by || "",
        level2At: formatDate(obj.approval?.level2?.at),
        level2Comment: obj.approval?.level2?.comment || "",

        usps: obj.usps?.length ? obj.usps.join(", ") : "",
        totalAmenities: obj.totalAmenities || "",
        allotedCarParking: obj.allotedCarParking || "",
        
        // Floor height values - store all fields
        clearFloorHeight: obj.clearFloorHeight || "",
        clearFloorHeightRetail: obj.clearFloorHeightRetail || "",
        clearFloorHeightFlats: obj.clearFloorHeightFlats || "",
        clearFloorHeightOffices: obj.clearFloorHeightOffices || "",
      });
    });

    // =============================
    // STYLING
    // =============================
    styleSheet(sheet);

    // Freeze Header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Auto Filter
    sheet.autoFilter = {
      from: "A1",
      to: sheet.getRow(1).lastCell.address
    };

    const filePath = path.join(
      exportDir,
      `Builder_Visits_${refName}_${timestamp}.xlsx`
    );

    await workbook.xlsx.writeFile(filePath);

    return filePath;

  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

// =============================
// HELPER FUNCTIONS
// =============================
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function styleSheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  headerRow.eachCell(cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

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