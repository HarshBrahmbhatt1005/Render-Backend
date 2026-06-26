import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      unique: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    segment: {
      type: String,
      enum: ["Customer", "CA", "Builder /Salesperson", "Broker", "DSA", ""],
    },
    contactNumber: {
      type: Number,
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

const toTitleCase = (str) => {
  if (!str) return "";
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

// Auto-increment srNo and Format TitleCase before saving
visitSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastVisit = await mongoose.models.Visit.findOne().sort({ srNo: -1 });
    this.srNo = lastVisit ? lastVisit.srNo + 1 : 1;
  }
  
  if (this.clientName) this.clientName = toTitleCase(this.clientName);
  if (this.companyName) this.companyName = toTitleCase(this.companyName);
  if (this.area) this.area = toTitleCase(this.area);
  if (this.referenceBy) this.referenceBy = toTitleCase(this.referenceBy);
  if (this.source) this.source = toTitleCase(this.source);
  if (this.meetingWith) this.meetingWith = toTitleCase(this.meetingWith);

  next();
});

export default mongoose.models.Visit || mongoose.model("Visit", visitSchema);
