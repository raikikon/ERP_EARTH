import mongoose from "mongoose";

const siteMaterialSchema = new mongoose.Schema(
  {
    materialTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    capacity: { type: Number, default: 0 },
    capacityUnit: String,
    currentStock: { type: Number, default: 0 }
  },
  { _id: false }
);

const siteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["holding", "rcm", "temporary"], required: true },
    address: String,
    latitude: Number,
    longitude: Number,
    siteKeeperName: String,
    siteKeeperPhone: String,
    materials: [siteMaterialSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Site", siteSchema);
