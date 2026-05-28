import Job from "../models/Job.js";

export async function refreshJobStatuses() {
  const now = new Date();
  await Job.updateMany(
    { completedQuantity: { $gte: 0 }, $expr: { $gte: ["$completedQuantity", "$requiredQuantity"] } },
    { $set: { status: "completed", adminApprovalRequired: false } }
  );
  await Job.updateMany(
    { endDate: { $lt: now }, status: { $nin: ["completed", "expired"] } },
    { $set: { status: "expired", adminApprovalRequired: true } }
  );
  await Job.updateMany(
    { startDate: { $lte: now }, endDate: { $gte: now }, status: "pending" },
    { $set: { status: "active" } }
  );
}
