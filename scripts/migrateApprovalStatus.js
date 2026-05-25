import mongoose from "mongoose";
import dotenv from "dotenv";
import BuilderVisitData from "../models/BuilderVisitData.js";

dotenv.config();

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/render-backend";

async function migrate() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to Mongo for migration");

  const docs = await BuilderVisitData.find();
  let changed = 0;
  const now = new Date();

  for (const d of docs) {
    let updated = false;

    if (!d.approval) {
      d.approval = {
        level1: { status: "Pending", by: "", at: null, comment: "" },
        level2: { status: "Pending", by: "", at: null, comment: "" },
      };
      updated = true;
    }

    const legacy = (d.approvalStatus || "").toLowerCase();
    if (legacy === "approved") {
      // Assume final approval was given previously -> set level2 approved
      d.approval.level2 = { status: "Approved", by: "migration", at: now, comment: "Mapped from legacy approvalStatus" };
      // keep level1 as Pending if not set
      if (d.approval.level1?.status !== "Approved") {
        d.approval.level1 = d.approval.level1 || { status: "Pending", by: "", at: null, comment: "" };
      }
      d.approvalStatus = "Approved";
      updated = true;
    } else if (legacy === "rejected" || legacy === "changes needed") {
      d.approval.level2 = { status: "Rejected", by: "migration", at: now, comment: "Mapped from legacy approvalStatus" };
      d.approvalStatus = "Changes Needed";
      updated = true;
    }

    if (updated) {
      await d.save();
      changed++;
    }
  }

  console.log(`Migration complete. Documents updated: ${changed}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
