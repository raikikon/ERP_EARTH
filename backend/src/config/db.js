import mongoose from "mongoose";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || "earthmovers_erp"
  });
  console.log("MongoDB connected");
}
