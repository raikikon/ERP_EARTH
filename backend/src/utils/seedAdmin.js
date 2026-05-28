import dotenv from "dotenv";
import User from "../models/User.js";
import Material from "../models/Material.js";
import { connectDb } from "../config/db.js";
import { hashPassword, DEFAULT_PASSWORD } from "./password.js";

dotenv.config();

export async function seedAdmin() {
  const existing = await User.findOne({ role: "admin" });
  if (!existing) {
    await User.create({
      role: "admin",
      name: "Administrator",
      phone: "9999999999",
      email: "admin@earthmovers.local",
      passwordHash: await hashPassword(DEFAULT_PASSWORD)
    });
    console.log("Admin created: admin@earthmovers.local / init@123");
  }

  const defaults = [
    ["earth", ["Dumper", "Tonn", "Cubic Meter"]],
    ["sand", ["Dumper", "Tonn", "Cubic Meter"]],
    ["reta", ["Dumper", "Tonn"]],
    ["bajri", ["Dumper", "Tonn"]]
  ];
  for (const [name, units] of defaults) {
    await Material.findOneAndUpdate({ name }, { name, units, isActive: true }, { upsert: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await connectDb();
  await seedAdmin();
  process.exit(0);
}
