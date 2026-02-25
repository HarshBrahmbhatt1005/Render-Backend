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

const executiveSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  number: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Executive number must be 10 digits'
    }
  }
});

const builderVisitSchema = new mongoose.Schema(
  {
    builderName: String,
    builderNumber: String,
    groupName: String,
    projectName: String,
    location: String,
    dateOfVisit: Date,
    gentry: String,
    businessType: String,
    officePersonDetails: String,
    // Developer office contact number (stored as string to preserve formatting)
    officePersonNumber: String,
    // Executives array - multiple executives with name and number
    executives: {
      type: [executiveSchema],
      default: [],
    },
    loanAccountNumber: { type: String, default: "" },
    saiFakiraManager: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    stageOfConstruction: String,
    developmentType: String,
    totalUnitsBlocks: String,
    totalBlocks: String,
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
    // Floor height fields - dynamic based on property type
    clearFloorHeight: { type: String, default: "" },
    clearFloorHeightRetail: { type: String, default: "" },
    clearFloorHeightFlats: { type: String, default: "" },
    clearFloorHeightOffices: { type: String, default: "" },
    // Email tracking to prevent duplicates
    emailSent: {
      submission: { type: Boolean, default: false },
      level2Approval: { type: Boolean, default: false },
    },
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
    usps: {
      type: [String],
      default: [],
    },
    totalAmenities: {
      type: String,
      default: "",
    },
    allotedCarParking: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Safe export to prevent OverwriteModelError
export default mongoose.models.BuilderVisit ||
  mongoose.model("BuilderVisit", builderVisitSchema);
