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
  },
  { timestamps: true }
);

// Safe export to prevent OverwriteModelError
export default mongoose.models.BuilderVisit ||
  mongoose.model("BuilderVisit", builderVisitSchema);
