import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["admin", "operator", "driver"], required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ["present", "absent"], default: "present" },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    checkInTime: Date,
    checkOutTime: Date,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
