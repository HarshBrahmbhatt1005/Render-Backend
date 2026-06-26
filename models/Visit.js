import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      unique: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    segment: {
      type: String,
      enum: ["Customer", "CA", "Builder /Salesperson", "Broker", "DSA"],
      required: true,
    },
    contactNumber: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v.toString());
        },
        message: (props) => `${props.value} is not a valid 10-digit phone number!`,
      },
    },
    alternativeNumber: {
      type: Number,
      validate: {
        validator: function (v) {
          return !v || /^\d{10}$/.test(v.toString());
        },
        message: (props) => `${props.value} is not a valid 10-digit phone number!`,
      },
    },
    area: {
      type: String,
      trim: true,
    },
    referenceBy: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    meetingWith: {
      type: String,
      trim: true,
    },
    meetingDate: {
      type: Date,
      required: true,
    },
    revisitDates: {
      type: [Date],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Auto-increment srNo before saving
visitSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastVisit = await mongoose.models.Visit.findOne().sort({ srNo: -1 });
    this.srNo = lastVisit ? lastVisit.srNo + 1 : 1;
  }
  next();
});

export default mongoose.models.Visit || mongoose.model("Visit", visitSchema);
