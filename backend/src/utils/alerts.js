import Alert from "../models/Alert.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Job from "../models/Job.js";
import { refreshJobStatuses } from "./jobs.js";

const DAY = 24 * 60 * 60 * 1000;

async function upsertAlert({ targetType, targetId, title, message, dueDate, severity }) {
  await Alert.findOneAndUpdate(
    { targetType, targetId, title, isResolved: false },
    { targetType, targetId, title, message, dueDate, severity, isResolved: false },
    { upsert: true, new: true }
  );
}

function severityFor(date) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return "expired";
  if (diff <= 30 * DAY) return "warning";
  return null;
}

export async function generateAlerts() {
  await refreshJobStatuses();

  const drivers = await User.find({ role: "driver", isActive: true });
  for (const driver of drivers) {
    const severity = severityFor(driver.dlValidity);
    if (severity) {
      await upsertAlert({
        targetType: "driver",
        targetId: driver._id,
        title: "Driving license",
        message: `${driver.name}'s driving license is ${severity === "expired" ? "expired" : "expiring within 30 days"}.`,
        dueDate: driver.dlValidity,
        severity
      });
    }
  }

  const vehicles = await Vehicle.find({ isActive: true });
  for (const vehicle of vehicles) {
    for (const doc of vehicle.documents || []) {
      const severity = severityFor(doc.endDate);
      if (severity) {
        await upsertAlert({
          targetType: "vehicle",
          targetId: vehicle._id,
          title: `${doc.type} document`,
          message: `${vehicle.vehicleNumber} ${doc.type} is ${severity === "expired" ? "expired" : "expiring within 30 days"}.`,
          dueDate: doc.endDate,
          severity
        });
      }
    }
  }

  const expiredJobs = await Job.find({ status: "expired" });
  for (const job of expiredJobs) {
    await upsertAlert({
      targetType: "job",
      targetId: job._id,
      title: "Expired incomplete job",
      message: `${job.title || job.materialName || "Job"} needs admin extension approval.`,
      dueDate: job.endDate,
      severity: "expired"
    });
  }
}
