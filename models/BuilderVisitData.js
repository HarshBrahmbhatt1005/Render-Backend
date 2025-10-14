import mongoose from "mongoose";

const propertySizeSchema = new mongoose.Schema({
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
    officePersonDetails: String,
    developmentType: String, // "Residential" | "Commercial"
    gentry: String,          // ✅ new field
    businessType: String,    // ✅ new field
    propertySizes: [propertySizeSchema],
    totalUnitsBlocks: String,
    currentPhase: String,
    expectedCompletionDate: Date,
    financingRequirements: String,
    residentType: String,
    avgAgreementValue: String,
    marketValue: String,
    nearbyProjects: String,
    surroundingCommunity: String,
    enquiryType: String,
    unitsForSale: String,
    timeLimitMonths: String,
    remark: String,
    payout: String,
    stageOfConstruction: String,
  },
  { timestamps: true }
);

export default mongoose.models.BuilderVisitData ||
  mongoose.model("BuilderVisitData", builderVisitSchema);
