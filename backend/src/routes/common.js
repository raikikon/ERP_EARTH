import express from "express";
import Vehicle from "../models/Vehicle.js";
import Site from "../models/Site.js";
import Material from "../models/Material.js";
import Alert from "../models/Alert.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/vehicles", auth, async (_req, res) => {
  res.json(await Vehicle.find({ isActive: true }).sort({ createdAt: -1 }));
});

router.get("/sites", auth, async (_req, res) => {
  res.json(await Site.find({ isActive: true }).populate("materials.materialTypeId").sort({ createdAt: -1 }));
});

router.get("/materials", auth, async (_req, res) => {
  res.json(await Material.find({ isActive: true }).sort({ name: 1 }));
});

router.get("/drivers", auth, async (_req, res) => {
  res.json(await User.find({ role: "driver", isActive: true }).select("-passwordHash").sort({ name: 1 }));
});

router.get("/alerts", auth, async (_req, res) => {
  res.json(await Alert.find({ isResolved: false }).sort({ severity: 1, dueDate: 1 }));
});

export default router;
