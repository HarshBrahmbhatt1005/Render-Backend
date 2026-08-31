import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callingDate: { type: Date, required: true },
  callerName: { type: String, required: true, trim: true },
  status: {
    type: String,
    required: true,
    trim: true,
    // No enum restriction — frontend manages the valid options list
  },
  remarks: { type: String, trim: true, default: "" },
  followUpDate: { type: Date }, // Optional follow-up date
  visitDate: { type: Date },
  visitRemark: { type: String, trim: true, default: "" },
});

const aiIntelligenceSchema = new mongoose.Schema(
  {
    leadScore: { type: Number, min: 0, max: 100 },
    priority: { type: String, enum: ["HOT", "WARM", "COLD", "LOW", "STOP"] },
    interestLevel: { type: String, trim: true, maxlength: 40 },
    shouldCallAgain: { type: Boolean },
    nextBestAction: {
      type: String,
      enum: ["Call Today", "Call Tomorrow", "Follow Up", "Call Later", "Do Not Call", "Review Required"],
    },
    suggestedFollowUpDate: { type: Date },
    summary: { type: String, trim: true, maxlength: 2000 },
    reasoning: { type: String, trim: true, maxlength: 4000 },
    confidence: { type: Number, min: 0, max: 100 },
    lastAnalyzedAt: { type: Date },
    isStale: { type: Boolean, default: false },

    // Compatibility names used by the current frontend, kept in the AI-only object.
    recommendedNextAction: {
      type: String,
      enum: ["Call Today", "Call Tomorrow", "Follow Up", "Call Later", "Do Not Call", "Review Required"],
    },
    shortSummary: { type: String, trim: true, maxlength: 2000 },
    reason: { type: String, trim: true, maxlength: 4000 },
    outdated: { type: Boolean, default: false },
    sourceFingerprint: { type: String, trim: true, maxlength: 20000 },
    callCount: { type: Number, min: 0 },
    signalSummary: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const realEstateLeadSchema = new mongoose.Schema(
  {
    leadDate: { type: Date, required: true, default: Date.now },
    customerName: { type: String, required: true, trim: true },
    customerNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: "Customer number must be exactly 10 digits",
      },
    },
    source: { type: String, required: true, trim: true },
    projectName: { type: String, trim: true, default: "" },
    referenceOf: { type: String, trim: true, default: "" },

    // Lead type: 'realestate' | 'finance'
    leadType: { type: String, trim: true, default: "realestate" },
    // Finance Lead fields
    financeProduct: { type: String, trim: true, default: "" },
    loanAmount: { type: String, trim: true, default: "" },
    passedOn: { type: String, trim: true, default: "" },

    // Universal Property Details (from root)
    propertyType: { type: String, trim: true, default: "" },
    budget: { type: String, trim: true, default: "" },
    preferredArea: { type: String, trim: true, default: "" },
    residentialSize: { type: String, trim: true, default: "" },
    residentialCategory: { type: String, trim: true, default: "" },
    commercialType: { type: String, trim: true, default: "" },
    assignedManager: { type: String, trim: true, default: "" },

    calls: { type: [callSchema], default: [] },
    aiIntelligence: { type: aiIntelligenceSchema, default: undefined },

    // Track which lead user submitted this lead (optional — null for admin-submitted)
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadUser",
      default: null,
    },
    submittedByUsername: {
      type: String,
      trim: true,
      default: "",
    },
    submittedByDisplayName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("RealEstateLead", realEstateLeadSchema, "realestate_leads");
