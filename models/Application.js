import mongoose from "mongoose";

const BuilderVisitSchema = new mongoose.Schema(
  {
    builderName: String,
    groupName: String,
    projectName: String,
    location: String,
    personMet: String,
    officePersonDetails: String,
    developmentType: String,
    propertySize: String,
    floor: String,
    sqft: String,
    aecAuda: String,
    selldedAmount: String,
    regularPrice: String,
    downPayment: String,
    maintenance: String,
    totalUnitsBlocks: String,
    currentPhase: String,
    expectedCompletionDate: Date,
    financingRequirements: String,
    financingDetails: String,
    residentType: String,
    avgAgreementValue: String,
    marketValue: String,
    nearbyProjects: String,
    surroundingCommunity: String,
    enquiryType: String,
    unitsForSale: String,
    timeLimitMonths: String,
    remark: String,
    approvalStatus: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true }
);

const BuilderVisitData = mongoose.model("BuilderVisitData", BuilderVisitSchema);

export default BuilderVisitData;
