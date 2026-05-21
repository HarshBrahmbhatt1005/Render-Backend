import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callingDate: { type: Date, required: true },
  manager: { type: String, required: true, trim: true },
  status: {
    type: String,
    required: true,
    trim: true,
    // No enum restriction — frontend manages the valid options list
  },
  remarks: { type: String, trim: true, default: "" },
  followUpDate: { type: Date }, // Optional follow-up date
});

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

    calls: { type: [callSchema], default: [] },

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
  },
  { timestamps: true }
);

export default mongoose.model("RealEstateLead", realEstateLeadSchema, "realestate_leads");
