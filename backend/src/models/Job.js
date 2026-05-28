import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driverName: String,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleNumber: String
  },
  { _id: false }
);

const progressLogSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    driverName: String,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleNumber: String,
    quantity: { type: Number, required: true },
    unit: String,
    note: String,
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    enteredAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const jobSchema = new mongoose.Schema(
  {
    title: String,
    materialTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    materialName: String,
    requiredQuantity: { type: Number, required: true },
    completedQuantity: { type: Number, default: 0 },
    unit: String,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    sourceSiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    destinationSiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    sourceSiteName: String,
    destinationSiteName: String,
    assignments: [assignmentSchema],
    progressLogs: [progressLogSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "expired"],
      default: "pending",
      index: true
    },
    adminApprovalRequired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

jobSchema.virtual("remainingQuantity").get(function () {
  return Math.max(0, this.requiredQuantity - this.completedQuantity);
});

jobSchema.virtual("completionPercent").get(function () {
  if (!this.requiredQuantity) return 0;
  return Math.min(100, Math.round((this.completedQuantity / this.requiredQuantity) * 100));
});

jobSchema.set("toJSON", { virtuals: true });
jobSchema.set("toObject", { virtuals: true });

export default mongoose.model("Job", jobSchema);
