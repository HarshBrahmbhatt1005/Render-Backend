import mongoose from "mongoose";

const propertySchema = new mongoose.Schema({
  size: String,
  floor: String,
  sqft: String,
  aecAuda: String,
  selldedAmount: String,
  regularPrice: String,
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
    stageOfConstruction: String,
    developmentType: String,
    totalUnitsBlocks: String,
    currentPhase: String,
    propertySizes: [propertySchema],
    expectedCompletionDate: Date,
    financingRequirements: String,
    residentType: String,
    avgAgreementValue: Number,
    marketValue: Number,
    nearbyProjects: String,
    surroundingCommunity: String,
    enquiryType: String,
    unitsForSale: Number,
    timeLimitMonths: Number,
    remark: String,
    payout: Number,
    approvalStatus: String,
  },
  { timestamps: true }
);

// Safe model export to prevent OverwriteModelError
export default  mongoose.model("BuilderVisit", builderVisitSchema);
