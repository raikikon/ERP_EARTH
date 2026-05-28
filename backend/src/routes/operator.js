import express from "express";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Site from "../models/Site.js";
import Material from "../models/Material.js";
import Attendance from "../models/Attendance.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { refreshJobStatuses } from "../utils/jobs.js";

const router = express.Router();
router.use(auth, allowRoles("operator"));

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function buildAssignments(assignments = []) {
  const out = [];
  for (const item of assignments) {
    const driver = await User.findOne({ _id: item.driverId, role: "driver", isActive: true });
    const vehicle = item.vehicleId ? await Vehicle.findById(item.vehicleId) : null;
    if (driver) {
      out.push({
        driverId: driver._id,
        driverName: driver.name,
        vehicleId: vehicle?._id,
        vehicleNumber: vehicle?.vehicleNumber || item.vehicleNumber || ""
      });
    }
  }
  return out;
}

async function hydrateJobPayload(body) {
  const [material, source, destination] = await Promise.all([
    Material.findById(body.materialTypeId),
    Site.findById(body.sourceSiteId),
    Site.findById(body.destinationSiteId)
  ]);
  return {
    ...body,
    materialName: material?.name,
    sourceSiteName: source?.name,
    destinationSiteName: destination?.name,
    assignments: await buildAssignments(body.assignments)
  };
}

router.get("/dashboard", async (req, res) => {
  const [attendance, jobs] = await Promise.all([
    Attendance.findOne({ userId: req.user._id, date: todayKey() }),
    Job.find({}).sort({ startDate: -1 }).limit(10)
  ]);
  res.json({ attendanceMarked: Boolean(attendance), attendance, jobs });
});

router.post("/mark-attendance", async (req, res) => {
  const date = todayKey();
  const attendance = await Attendance.findOneAndUpdate(
    { userId: req.user._id, date },
    {
      userId: req.user._id,
      role: "operator",
      date,
      status: "present",
      checkInTime: req.body.checkInTime || new Date(),
      markedBy: req.user._id
    },
    { upsert: true, new: true }
  );
  res.json(attendance);
});

router.get("/jobs", async (_req, res) => {
  await refreshJobStatuses();
  res.json(await Job.find({}).populate("materialTypeId sourceSiteId destinationSiteId assignments.driverId assignments.vehicleId progressLogs.driverId progressLogs.vehicleId").sort({ startDate: -1 }));
});

router.post("/create-job", async (req, res) => {
  const payload = await hydrateJobPayload(req.body);
  const job = await Job.create({ ...payload, createdBy: req.user._id });
  await refreshJobStatuses();
  res.status(201).json(job);
});

router.post("/edit-job/:jobId", async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (new Date() >= new Date(job.startDate)) {
    return res.status(400).json({ message: "Job can be edited only before its start date" });
  }
  const payload = await hydrateJobPayload(req.body);
  res.json(await Job.findByIdAndUpdate(job._id, payload, { new: true }));
});

router.post("/update-drivers/:jobId", async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (new Date() >= new Date(job.startDate)) {
    return res.status(400).json({ message: "Driver assignments can be edited only before start date" });
  }
  const assignments = await buildAssignments(req.body.assignments || []);
  res.json(await Job.findByIdAndUpdate(job._id, { assignments }, { new: true }));
});

router.post("/update-progress/:jobId", async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    { completedQuantity: Math.max(0, Number(req.body.completedQuantity || 0)) },
    { new: true }
  );
  await refreshJobStatuses();
  res.json(await Job.findById(job._id));
});

router.post("/add-material/:jobId", async (req, res) => {
  const quantity = Number(req.body.quantity || 0);
  if (!quantity || quantity <= 0) return res.status(400).json({ message: "Quantity must be greater than 0" });

  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.status === "expired" || job.adminApprovalRequired) {
    return res.status(400).json({ message: "Expired jobs need admin extension before progress can be added" });
  }

  const remaining = Math.max(0, Number(job.requiredQuantity || 0) - Number(job.completedQuantity || 0));
  if (quantity > remaining) {
    return res.status(400).json({ message: `Quantity cannot exceed remaining material (${remaining} ${job.unit || ""})` });
  }

  const assignment = job.assignments.find((item) => String(item.driverId) === String(req.body.driverId));
  if (!assignment) return res.status(400).json({ message: "Select one of the drivers assigned to this job" });

  job.completedQuantity = Number(job.completedQuantity || 0) + quantity;
  job.progressLogs.push({
    driverId: assignment.driverId,
    driverName: assignment.driverName,
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
    await Job.findById(job._id).populate("materialTypeId sourceSiteId destinationSiteId assignments.driverId assignments.vehicleId progressLogs.driverId progressLogs.vehicleId")
  );
});

export default router;
