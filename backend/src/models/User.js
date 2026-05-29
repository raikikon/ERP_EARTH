import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    type: String,
    number: String,
    imageUrl: String,
    startDate: Date,
    endDate: Date,
    details: String
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["admin", "operator", "driver"], required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, trim: true, index: true },
    passwordHash: { type: String, required: true },
    address: String,
    photoUrl: String,
    govtIdNumber: String,
    aadharNumber: String,
    aadharPhotoUrl: String,
    dlNumber: String,
    dlValidity: Date,
    documents: [documentSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.index({ phone: 1, role: 1 });

export default mongoose.model("User", userSchema);
