import mongoose from "mongoose";

const vehicleDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["fitness", "insurance", "rc", "puc", "roadTax", "other"],
      required: true
    },
    number: String,
    imageUrl: String,
    startDate: Date,
    endDate: Date,
    vehicleNumber: String
  },
  { _id: true, timestamps: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    model: String,
    type: { type: String, required: true },
    photoUrl: String,
    registrationDate: Date,
    registrationNumber: String,
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    documents: [vehicleDocumentSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
