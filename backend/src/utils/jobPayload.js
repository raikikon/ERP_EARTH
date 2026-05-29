import Material from "../models/Material.js";
import Site from "../models/Site.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";

export async function buildAssignments(assignments = []) {
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

export async function hydrateJobPayload(body) {
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
