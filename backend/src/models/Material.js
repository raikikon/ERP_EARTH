import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    units: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);
