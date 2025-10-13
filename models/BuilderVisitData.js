import mongoose from "mongoose";

const builderVisitSchema = new mongoose.Schema({
  builderName: String,
  groupName: String,
  projectName: String,
  location: String,
  dateOfVisit: Date,
  personMet: String,
  officePersonDetails: String,
  developmentType: String,
  totalUnitsBlocks: String,
  currentPhase: String,
  propertySize: String,
  expectedCompletionDate: Date,
  financingRequirements: String,
  financingDetails: String,
  residentType: String,
  avgAgreementValue: Number,
  marketValue: Number,
  nearbyProjects: String,
  surroundingCommunity: String,
  enquiryType: String,
  unitsForSale: Number,
  timeLimitMonths: Number,
  remark: String,
  approvalStatus: String, // Pending / Approved / Rejected
}, { timestamps: true });

export default mongoose.model("BuilderVisit", builderVisitSchema);
