import express from "express";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Material from "../models/Material.js";
import Site from "../models/Site.js";
import Job from "../models/Job.js";
import Attendance from "../models/Attendance.js";
import Alert from "../models/Alert.js";
import { auth, allowRoles } from "../middleware/auth.js";
import { DEFAULT_PASSWORD, hashPassword } from "../utils/password.js";
import { uploadBase64Image } from "../utils/upload.js";
import { refreshJobStatuses } from "../utils/jobs.js";
import { generateAlerts } from "../utils/alerts.js";

const router = express.Router();
router.use(auth, allowRoles("admin"));

const userSelect = "-passwordHash";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function withUploadedImages(payload, fields) {
  const next = { ...payload };
  delete next.email;
  for (const field of fields) {
    if (next[field]) next[field] = await uploadBase64Image(next[field]);
  }
  return next;
}

async function attachAttendance(users) {
  const ids = users.map((user) => user._id);
  const [todayAttendance, recentAttendance] = await Promise.all([
    Attendance.find({ userId: { $in: ids }, date: todayKey() }).populate("vehicleId", "vehicleNumber").lean(),
    Attendance.find({ userId: { $in: ids } }).populate("vehicleId", "vehicleNumber").sort({ date: -1, createdAt: -1 }).lean()
  ]);
  const todayByUser = new Map(todayAttendance.map((item) => [String(item.userId), item]));
  const historyByUser = new Map();
  for (const item of recentAttendance) {
    const key = String(item.userId);
    const history = historyByUser.get(key) || [];
    if (history.length < 20) history.push(item);
    historyByUser.set(key, history);
  }
  return users.map((user) => {
    const id = String(user._id);
    return {
      ...user,
      todayAttendance: todayByUser.get(id) || null,
      attendanceHistory: historyByUser.get(id) || []
    };
  });
}

router.get("/dashboard-stats", async (_req, res) => {
  await refreshJobStatuses();
  const [totalDrivers, totalOperators, totalVehicles, activeJobs, expiredJobs, pendingAlerts] = await Promise.all([
    User.countDocuments({ role: "driver", isActive: true }),
    User.countDocuments({ role: "operator", isActive: true }),
    Vehicle.countDocuments({ isActive: true }),
    Job.countDocuments({ status: { $in: ["pending", "active"] } }),
    Job.countDocuments({ status: "expired" }),
    Alert.countDocuments({ isResolved: false })
  ]);
  res.json({ totalDrivers, totalOperators, totalVehicles, activeJobs, expiredJobs, pendingAlerts });
});

router.get("/drivers", async (_req, res) => {
  const drivers = await User.find({ role: "driver", isActive: true }).select(userSelect).sort({ createdAt: -1 }).lean();
  res.json(await attachAttendance(drivers));
});

router.get("/operators", async (_req, res) => {
  const operators = await User.find({ role: "operator", isActive: true }).select(userSelect).sort({ createdAt: -1 }).lean();
  res.json(await attachAttendance(operators));
});

router.get("/vehicles", async (_req, res) => {
  res.json(await Vehicle.find({ isActive: true }).sort({ createdAt: -1 }));
});

router.post("/create-operator", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl"]);
  const operator = await User.create({
    ...payload,
    role: "operator",
    passwordHash: await hashPassword(req.body.password || DEFAULT_PASSWORD)
  });
  res.status(201).json(await User.findById(operator._id).select(userSelect));
});

router.post("/update-operator/:operatorId", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl"]);
  delete payload.password;
  const operator = await User.findOneAndUpdate(
    { _id: req.params.operatorId, role: "operator" },
    payload,
    { new: true }
  ).select(userSelect);
  res.json(operator);
});

router.post("/delete-operator/:operatorId", async (req, res) => {
  await User.findOneAndUpdate({ _id: req.params.operatorId, role: "operator" }, { isActive: false });
  res.json({ message: "Operator deleted" });
});

router.post("/reset-password/:userId", async (req, res) => {
  await User.findByIdAndUpdate(req.params.userId, { passwordHash: await hashPassword(DEFAULT_PASSWORD) });
  res.json({ message: "Password reset to init@123" });
});

router.post("/create-driver", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl", "aadharPhotoUrl"]);
  const driver = await User.create({
    ...payload,
    role: "driver",
    passwordHash: await hashPassword(req.body.password || DEFAULT_PASSWORD)
  });
  res.status(201).json(await User.findById(driver._id).select(userSelect));
});

router.post("/update-driver/:driverId", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl", "aadharPhotoUrl"]);
  delete payload.password;
  const driver = await User.findOneAndUpdate({ _id: req.params.driverId, role: "driver" }, payload, { new: true }).select(userSelect);
  res.json(driver);
});

router.post("/update-driver-documents/:driverId", async (req, res) => {
  const doc = await withUploadedImages(req.body, ["imageUrl"]);
  const update = { $push: { documents: doc } };
  if (doc.type === "drivingLicense" && doc.endDate) update.$set = { dlValidity: doc.endDate, dlNumber: doc.number };
  const driver = await User.findOneAndUpdate(
    { _id: req.params.driverId, role: "driver" },
    update,
    { new: true }
  ).select(userSelect);
  await generateAlerts();
  res.json(driver);
});

router.post("/delete-driver/:driverId", async (req, res) => {
  await User.findOneAndUpdate({ _id: req.params.driverId, role: "driver" }, { isActive: false });
  res.json({ message: "Driver deleted" });
});

router.post("/create-vehicle", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl"]);
  res.status(201).json(await Vehicle.create(payload));
});

router.post("/update-vehicle/:vehicleId", async (req, res) => {
  const payload = await withUploadedImages(req.body, ["photoUrl"]);
  res.json(await Vehicle.findByIdAndUpdate(req.params.vehicleId, payload, { new: true }));
});

router.post("/update-vehicle-documents/:vehicleId", async (req, res) => {
  const doc = await withUploadedImages(req.body, ["imageUrl"]);
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.vehicleId, { $push: { documents: doc } }, { new: true });
  await generateAlerts();
  res.json(vehicle);
});

router.post("/delete-vehicle/:vehicleId", async (req, res) => {
  await Vehicle.findByIdAndUpdate(req.params.vehicleId, { isActive: false });
  res.json({ message: "Vehicle deleted" });
});

router.post("/create-material", async (req, res) => {
  const material = await Material.findOneAndUpdate(
    { name: req.body.name },
    { name: req.body.name, units: req.body.units || [], isActive: true },
    { upsert: true, new: true }
  );
  res.status(201).json(material);
});

router.post("/update-material/:materialId", async (req, res) => {
  res.json(await Material.findByIdAndUpdate(req.params.materialId, req.body, { new: true }));
});

router.post("/delete-material/:materialId", async (req, res) => {
  await Material.findByIdAndUpdate(req.params.materialId, { isActive: false });
  res.json({ message: "Material deleted" });
});

router.post("/add-material-unit/:materialId", async (req, res) => {
  res.json(await Material.findByIdAndUpdate(req.params.materialId, { $addToSet: { units: req.body.unit } }, { new: true }));
});

router.post("/remove-material-unit/:materialId/:unit", async (req, res) => {
  res.json(await Material.findByIdAndUpdate(req.params.materialId, { $pull: { units: req.params.unit } }, { new: true }));
});

router.post("/create-site", async (req, res) => {
  res.status(201).json(await Site.create(req.body));
});

router.post("/update-site/:siteId", async (req, res) => {
  res.json(await Site.findByIdAndUpdate(req.params.siteId, req.body, { new: true }));
});

router.post("/delete-site/:siteId", async (req, res) => {
  await Site.findByIdAndUpdate(req.params.siteId, { isActive: false });
  res.json({ message: "Site deleted" });
});

router.post("/update-site-material/:siteId/:materialId", async (req, res) => {
  const site = await Site.findOneAndUpdate(
    { _id: req.params.siteId, "materials.materialTypeId": req.params.materialId },
    {
      $set: {
        "materials.$.capacity": req.body.capacity,
        "materials.$.capacityUnit": req.body.capacityUnit,
        "materials.$.currentStock": req.body.currentStock
      }
    },
    { new: true }
  );
  res.json(site);
});

router.post("/mark-attendance", async (req, res) => {
  const user = await User.findById(req.body.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  const attendance = await Attendance.findOneAndUpdate(
    { userId: user._id, date: req.body.date },
    { ...req.body, role: user.role, markedBy: req.user._id },
    { upsert: true, new: true }
  );
  res.json(attendance);
});

router.get("/attendance/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId).select(userSelect);
  if (!user) return res.status(404).json({ message: "User not found" });
  const rows = await Attendance.find({ userId: user._id }).populate("vehicleId", "vehicleNumber").sort({ date: 1, createdAt: 1 });
  res.json({ user, attendance: rows });
});

router.get("/expired-jobs", async (_req, res) => {
  await refreshJobStatuses();
  res.json(await Job.find({ status: "expired" }).populate("materialTypeId sourceSiteId destinationSiteId assignments.driverId assignments.vehicleId"));
});

router.post("/extend-job/:jobId", async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.jobId,
    { startDate: req.body.startDate, endDate: req.body.endDate, status: "pending", adminApprovalRequired: false },
    { new: true }
  );
  await refreshJobStatuses();
  res.json(job);
});

export default router;
