import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callingDate: { type: Date, required: true },
  manager: { type: String, required: true, trim: true },
  status: {
    type: String,
    required: true,
    trim: true,
    enum: ["Ringing", "Call Not Connected", "Not Interested", "Call Connected", "Interested"],
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

    // Universal Property Details (from root)
    propertyType: { type: String, trim: true, default: "" },
    budget: { type: String, trim: true, default: "" },
    preferredArea: { type: String, trim: true, default: "" },
    residentialSize: { type: String, trim: true, default: "" },
    residentialCategory: { type: String, trim: true, default: "" },
    commercialType: { type: String, trim: true, default: "" },

    calls: { type: [callSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("RealEstateLead", realEstateLeadSchema, "realestate_leads");
