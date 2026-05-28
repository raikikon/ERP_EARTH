import express from "express";
import Job from "../models/Job.js";
import Attendance from "../models/Attendance.js";
import Alert from "../models/Alert.js";
import Vehicle from "../models/Vehicle.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { refreshJobStatuses } from "../utils/jobs.js";

const router = express.Router();
router.use(auth, allowRoles("driver"));

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/dashboard", async (req, res) => {
  await refreshJobStatuses();
  const [attendance, jobs, previousAttendance] = await Promise.all([
    Attendance.findOne({ userId: req.user._id, date: todayKey() }).populate("vehicleId"),
    Job.find({ "assignments.driverId": req.user._id }).sort({ startDate: -1 }),
    Attendance.find({ userId: req.user._id }).sort({ date: -1 }).limit(60)
  ]);
  const alerts = await Alert.find({
    isResolved: false,
    $or: [
      { targetType: "driver", targetId: req.user._id },
      ...(attendance?.vehicleId ? [{ targetType: "vehicle", targetId: attendance.vehicleId._id }] : [])
    ]
  }).sort({ severity: 1, dueDate: 1 });
  res.json({ attendance, jobs, previousAttendance, alerts });
});

router.post("/mark-attendance", async (req, res) => {
  const date = todayKey();
  if (!req.body.vehicleId) return res.status(400).json({ message: "vehicleId is required" });
  const vehicle = await Vehicle.findById(req.body.vehicleId);
  if (!vehicle || !vehicle.isActive) return res.status(404).json({ message: "Vehicle not found" });
  const existing = await Attendance.findOne({ userId: req.user._id, date });
  if (existing && existing.createdAt.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ message: "Old attendance cannot be modified by driver" });
  }
  const attendance = await Attendance.findOneAndUpdate(
    { userId: req.user._id, date },
    {
      userId: req.user._id,
      role: "driver",
      date,
      status: "present",
      vehicleId: vehicle._id,
      checkInTime: req.body.checkInTime || new Date(),
      markedBy: req.user._id
    },
    { upsert: true, new: true }
  ).populate("vehicleId");
  res.json(attendance);
});

router.get("/jobs", async (req, res) => {
  await refreshJobStatuses();
  res.json(await Job.find({ "assignments.driverId": req.user._id }).populate("materialTypeId sourceSiteId destinationSiteId assignments.vehicleId"));
});

router.get("/attendance", async (req, res) => {
  res.json(await Attendance.find({ userId: req.user._id }).sort({ date: -1 }));
});

export default router;
