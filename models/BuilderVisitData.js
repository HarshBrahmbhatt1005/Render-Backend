import mongoose from "mongoose";

const propertySchema = new mongoose.Schema({
  size: String,
  floor: String,
  sqft: String,
  aecAuda: String,
  selldedAmount: String,
  boxPrice: String,
  downPayment: String,
  maintenance: String,
  // New property-specific fields
  plc: String,
  frc: String,
  maintenanceDeposit: String,
  category: String,
  sqyd: String,
  basicRate: String,
});

const builderVisitSchema = new mongoose.Schema(
  {
    builderName: String,
    groupName: String,
    projectName: String,
    location: String,
    dateOfVisit: Date,
    gentry: String,
    businessType: String,
    officePersonDetails: String,
    // Developer office contact number (stored as string to preserve formatting)
    officePersonNumber: String,
    stageOfConstruction: String,
    developmentType: String,
    totalUnitsBlocks: String,
    propertySizes: {
      type: [propertySchema],
      default: [],
    },
    expectedCompletionDate: String,
    negotiable: String,
    financingRequirements: String,
    residentType: String,
    nearbyProjects: String,
    surroundingCommunity: String,
    enquiryType: String,
    unitsForSale: String,
    timeLimitMonths: Number,
    remark: String,
    payout: String,
    approvalStatus: String,
    // New approval object (Level 1 and Level 2)
    approval: {
      level1: {
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
        by: { type: String, default: "" },
        at: { type: Date },
        comment: { type: String, default: "" },
      },
      level2: {
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
        by: { type: String, default: "" },
        at: { type: Date },
        comment: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

// Safe export to prevent OverwriteModelError
export default mongoose.models.BuilderVisit ||
  mongoose.model("BuilderVisit", builderVisitSchema);
