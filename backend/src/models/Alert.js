import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["driver", "vehicle", "job"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    severity: { type: String, enum: ["warning", "expired"], required: true },
    title: String,
    message: String,
    dueDate: Date,
    isResolved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

alertSchema.index({ targetType: 1, targetId: 1, title: 1, isResolved: 1 });

export default mongoose.model("Alert", alertSchema);
