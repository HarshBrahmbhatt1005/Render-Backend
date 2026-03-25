import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callingDate: { type: Date, required: true },
  manager: { type: String, required: true, trim: true, default: "Sai Fakira Manager" },
  status: {
    type: String,
    required: true,
    trim: true,
    enum: ["Ringing", "Call Not Connected", "Not Interested", "Call Connected", "Interested"],
  },
  remarks: { type: String, trim: true, default: "" },
  // Shown only when status is Call Connected / Interested
  propertyType: { type: String, trim: true, default: "" },
  budget: { type: String, trim: true, default: "" },
  preferredArea: { type: String, trim: true, default: "" },
  // Residential sub-fields
  residentialSize: { type: String, trim: true, default: "" },
  residentialCategory: { type: String, trim: true, default: "" },
  // Commercial sub-field
  commercialType: { type: String, trim: true, default: "" },
});

const realEstateLeadSchema = new mongoose.Schema(
  {
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
    calls: { type: [callSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("RealEstateLead", realEstateLeadSchema, "realestate_leads");
