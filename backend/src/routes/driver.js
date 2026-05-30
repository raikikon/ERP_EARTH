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
  res.json(
    await Job.find({ "assignments.driverId": req.user._id })
      .populate("materialTypeId sourceSiteId destinationSiteId assignments.vehicleId progressLogs.driverId progressLogs.vehicleId")
      .sort({ startDate: -1 })
  );
});

router.post("/add-material/:jobId", async (req, res) => {
  await refreshJobStatuses();
  const quantity = Number(req.body.quantity || 0);
  if (!quantity || quantity <= 0) return res.status(400).json({ message: "Quantity must be greater than 0" });

  const job = await Job.findOne({ _id: req.params.jobId, "assignments.driverId": req.user._id });
  if (!job) return res.status(404).json({ message: "Assigned job not found" });
  if (job.status === "expired" || job.adminApprovalRequired) {
    return res.status(400).json({ message: "Expired jobs need admin extension before material can be dumped" });
  }

  const remaining = Math.max(0, Number(job.requiredQuantity || 0) - Number(job.completedQuantity || 0));
  if (quantity > remaining) {
    return res.status(400).json({ message: `Quantity cannot exceed remaining material (${remaining} ${job.unit || ""})` });
  }

  const assignment = job.assignments.find((item) => String(item.driverId) === String(req.user._id));
  if (!assignment) return res.status(400).json({ message: "This job is not assigned to the logged-in driver" });

  job.completedQuantity = Number(job.completedQuantity || 0) + quantity;
  job.progressLogs.push({
    driverId: assignment.driverId,
    driverName: assignment.driverName || req.user.name,
    vehicleId: assignment.vehicleId,
    vehicleNumber: assignment.vehicleNumber,
    quantity,
    unit: req.body.unit || job.unit,
    note: req.body.note,
    enteredBy: req.user._id
  });
  await job.save();
  await refreshJobStatuses();

  res.json(
    await Job.findById(job._id)
      .populate("materialTypeId sourceSiteId destinationSiteId assignments.driverId assignments.vehicleId progressLogs.driverId progressLogs.vehicleId")
  );
});

router.get("/attendance", async (req, res) => {
  res.json(await Attendance.find({ userId: req.user._id }).sort({ date: -1 }));
});

export default router;
