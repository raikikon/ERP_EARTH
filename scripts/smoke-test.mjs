const apiBase = process.env.API_BASE_URL || "http://localhost:5050/api";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5050";
const stamp = Date.now().toString().slice(-6);
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, body, token) {
  const response = await fetch(apiBase + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function step(name, fn) {
  try {
    const data = await fn();
    results.push({ name, ok: true });
    return data;
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    throw error;
  }
}

try {
  await step("frontend login page is served", async () => {
    const html = await fetch(frontendUrl).then((response) => response.text());
    if (!html.includes("root")) throw new Error("Frontend root element missing");
    return true;
  });

  const adminLogin = await step("admin login", () =>
    request("POST", "/auth/login", { phone: "9999999999", password: "init@123" })
  );
  const adminToken = adminLogin.token;

  await step("admin dashboard stats", () => request("GET", "/admin/dashboard-stats", null, adminToken));

  const material = await step("create material", () =>
    request("POST", "/admin/create-material", { name: `Smoke Sand ${stamp}`, units: ["Dumper", "Tonn", "Cubic Meter"] }, adminToken)
  );
  const editMaterial = await step("create material for job edit", () =>
    request("POST", "/admin/create-material", { name: `Smoke Earth ${stamp}`, units: ["Truckload", "Tonn"] }, adminToken)
  );
  await step("add material unit", () => request("POST", `/admin/add-material-unit/${material._id}`, { unit: "Quintal" }, adminToken));
  await step("remove material unit", () => request("POST", `/admin/remove-material-unit/${material._id}/Quintal`, {}, adminToken));

  const holdingSite = await step("create holding site", () =>
    request(
      "POST",
      "/admin/create-site",
      {
        name: `Holding Smoke ${stamp}`,
        type: "holding",
        address: "North yard",
        latitude: 22.71,
        longitude: 75.82,
        siteKeeperName: "Keeper A",
        siteKeeperPhone: "9000000001",
        materials: [{ materialTypeId: material._id, capacity: 1000, capacityUnit: "Dumper", currentStock: 20 }]
      },
      adminToken
    )
  );
  const tempSite = await step("create temporary site", () =>
    request(
      "POST",
      "/admin/create-site",
      {
        name: `Temporary Smoke ${stamp}`,
        type: "temporary",
        address: "Project site",
        latitude: 22.72,
        longitude: 75.83,
        siteKeeperName: "Keeper B",
        siteKeeperPhone: "9000000002",
        materials: [{ materialTypeId: material._id, capacity: 500, capacityUnit: "Dumper", currentStock: 0 }]
      },
      adminToken
    )
  );
  await step("update site material", () =>
    request(
      "POST",
      `/admin/update-site-material/${holdingSite._id}/${material._id}`,
      { capacity: 1200, capacityUnit: "Dumper", currentStock: 25 },
      adminToken
    )
  );

  const vehicle = await step("create vehicle", () =>
    request(
      "POST",
      "/admin/create-vehicle",
      {
        name: `Smoke Dumper ${stamp}`,
        brand: "Tata",
        model: "LPT",
        type: "dumper",
        vehicleNumber: `SMK-${stamp}`,
        registrationNumber: `REG-${stamp}`,
        registrationDate: "2026-05-01"
      },
      adminToken
    )
  );
  const vehicleTwo = await step("create second vehicle", () =>
    request(
      "POST",
      "/admin/create-vehicle",
      {
        name: `Smoke Tipper ${stamp}`,
        brand: "Ashok Leyland",
        model: "Boss",
        type: "truck",
        vehicleNumber: `SMK2-${stamp}`,
        registrationNumber: `REG2-${stamp}`,
        registrationDate: "2026-05-01"
      },
      adminToken
    )
  );
  await step("add vehicle document", () =>
    request(
      "POST",
      `/admin/update-vehicle-documents/${vehicle._id}`,
      { type: "puc", number: `PUC-${stamp}`, startDate: "2026-05-01", endDate: "2026-06-10", vehicleNumber: vehicle.vehicleNumber },
      adminToken
    )
  );
  await step("add second vehicle document", () =>
    request(
      "POST",
      `/admin/update-vehicle-documents/${vehicleTwo._id}`,
      { type: "fitness", number: `FIT-${stamp}`, startDate: "2026-05-01", endDate: "2026-06-12", vehicleNumber: vehicleTwo.vehicleNumber },
      adminToken
    )
  );

  const driver = await step("create driver", () =>
    request(
      "POST",
      "/admin/create-driver",
      {
        name: `Smoke Driver ${stamp}`,
        phone: `81${stamp}00`,
        address: "Driver address",
        aadharNumber: `AAD${stamp}`,
        dlNumber: `DL-${stamp}`,
        dlValidity: "2026-06-10"
      },
      adminToken
    )
  );
  const driverTwo = await step("create second driver", () =>
    request(
      "POST",
      "/admin/create-driver",
      {
        name: `Smoke Driver Two ${stamp}`,
        phone: `83${stamp}00`,
        address: "Second driver address",
        aadharNumber: `AAD2${stamp}`,
        dlNumber: `DL2-${stamp}`,
        dlValidity: "2026-06-12"
      },
      adminToken
    )
  );
  await step("add driver DL document", () =>
    request("POST", `/admin/update-driver-documents/${driver._id}`, { type: "drivingLicense", number: `DL-${stamp}`, endDate: "2026-06-10" }, adminToken)
  );
  await step("add second driver DL document", () =>
    request("POST", `/admin/update-driver-documents/${driverTwo._id}`, { type: "drivingLicense", number: `DL2-${stamp}`, endDate: "2026-06-12" }, adminToken)
  );

  const operator = await step("create operator", () =>
    request(
      "POST",
      "/admin/create-operator",
      { name: `Smoke Operator ${stamp}`, phone: `82${stamp}00`, address: "Operator office" },
      adminToken
    )
  );
  await step("reset operator password", () => request("POST", `/admin/reset-password/${operator._id}`, {}, adminToken));
  await step("admin mark operator attendance", () =>
    request(
      "POST",
      "/admin/mark-attendance",
      { userId: operator._id, date: today, status: "present", checkInTime: `${today}T05:20:00.000Z` },
      adminToken
    )
  );
  await step("admin mark driver attendance", () =>
    request(
      "POST",
      "/admin/mark-attendance",
      { userId: driver._id, date: today, status: "present", vehicleId: vehicle._id, checkInTime: `${today}T05:30:00.000Z` },
      adminToken
    )
  );
  await step("admin mark driver absent day", () =>
    request(
      "POST",
      "/admin/mark-attendance",
      { userId: driver._id, date: yesterday, status: "absent" },
      adminToken
    )
  );
  await step("admin mark second driver attendance", () =>
    request(
      "POST",
      "/admin/mark-attendance",
      { userId: driverTwo._id, date: today, status: "present", vehicleId: vehicleTwo._id, checkInTime: `${today}T05:40:00.000Z` },
      adminToken
    )
  );
  await step("admin attendance calendar data shows present and absent", async () => {
    const history = await request("GET", `/admin/attendance/${driver._id}`, null, adminToken);
    assert(history.user?._id === driver._id, "Attendance history should include selected user");
    assert(history.attendance?.some((item) => item.date === today && item.status === "present"), "Attendance calendar data should include present day");
    assert(history.attendance?.some((item) => item.date === yesterday && item.status === "absent"), "Attendance calendar data should include absent day");
    return history;
  });
  await step("admin driver and operator lists show today attendance", async () => {
    const [drivers, operators] = await Promise.all([
      request("GET", "/admin/drivers", null, adminToken),
      request("GET", "/admin/operators", null, adminToken)
    ]);
    const listedDriver = drivers.find((item) => item._id === driver._id);
    const listedOperator = operators.find((item) => item._id === operator._id);
    assert(listedDriver?.todayAttendance?.status === "present", "Driver list should include today's present attendance");
    assert(listedDriver?.attendanceHistory?.length > 0, "Driver profile data should include attendance history");
    assert(listedOperator?.todayAttendance?.status === "present", "Operator list should include today's present attendance");
    assert(listedOperator?.attendanceHistory?.length > 0, "Operator profile data should include attendance history");
    return true;
  });

  const adminJob = await step("admin create future job", () =>
    request(
      "POST",
      "/admin/create-job",
      {
        title: `Admin Smoke Job ${stamp}`,
        materialTypeId: material._id,
        requiredQuantity: 3,
        unit: "Dumper",
        startDate: "2026-06-10",
        endDate: "2026-06-11",
        sourceSiteId: holdingSite._id,
        destinationSiteId: tempSite._id,
        assignments: [{ driverId: driver._id, vehicleId: vehicle._id }]
      },
      adminToken
    )
  );
  await step("admin jobs list includes created job", async () => {
    const jobs = await request("GET", "/admin/jobs", null, adminToken);
    const created = jobs.find((item) => item._id === adminJob._id);
    assert(created, "Admin-created job missing from admin jobs list");
    assert(created.assignments?.some((item) => item.driverId?._id === driver._id), "Admin-created job should keep assigned driver");
    return created;
  });

  const operatorLogin = await step("operator login", () => request("POST", "/auth/login", { phone: operator.phone, password: "init@123" }));
  const operatorToken = operatorLogin.token;
  const job = await step("operator create future job", () =>
    request(
      "POST",
      "/operator/create-job",
      {
        title: `Smoke Job ${stamp}`,
        materialTypeId: material._id,
        requiredQuantity: 5,
        unit: "Dumper",
        startDate: "2026-06-06",
        endDate: "2026-06-07",
        sourceSiteId: holdingSite._id,
        destinationSiteId: tempSite._id,
        assignments: [{ driverId: driver._id, vehicleId: vehicle._id }]
      },
      operatorToken
    )
  );
  await step("operator allocates job to two drivers", async () => {
    const updated = await request(
      "POST",
      `/operator/update-drivers/${job._id}`,
      {
        assignments: [
          { driverId: driver._id, vehicleId: vehicle._id },
          { driverId: driverTwo._id, vehicleId: vehicleTwo._id }
        ]
      },
      operatorToken
    );
    assert(updated.assignments?.length === 2, "Job should have two driver assignments");
    assert(updated.assignments.some((item) => item.driverId === driver._id), "Primary driver assignment missing");
    assert(updated.assignments.some((item) => item.driverId === driverTwo._id), "Second driver assignment missing");
    return updated;
  });
  await step("operator adds material by selecting assigned driver", async () => {
    const updated = await request("POST", `/operator/add-material/${job._id}`, { driverId: driver._id, quantity: 2, unit: "Dumper" }, operatorToken);
    assert(updated.completedQuantity === 2, "Added material should increase completed quantity to 2");
    assert(updated.progressLogs?.length === 1, "Progress log should be created");
    assert(updated.progressLogs[0].driverId?._id === driver._id || updated.progressLogs[0].driverId === driver._id, "Progress log should store selected driver");
    assert(updated.progressLogs[0].quantity === 2, "Progress log quantity mismatch");
    return updated;
  });
  await step("operator jobs list includes allocated drivers and material log", async () => {
    const jobs = await request("GET", "/operator/jobs", null, operatorToken);
    const allocated = jobs.find((item) => item._id === job._id);
    assert(allocated, "Allocated job missing from operator job list");
    assert(allocated.completedQuantity === 2, "Operator job progress did not update to 2");
    assert(allocated.progressLogs?.some((item) => item.driverId?._id === driver._id && item.quantity === 2), "Operator job list missing selected-driver material log");
    assert(allocated.assignments?.length === 2, "Operator job list should show two assigned drivers");
    assert(allocated.assignments.some((item) => item.driverId?._id === driver._id), "Operator job list missing primary driver");
    assert(allocated.assignments.some((item) => item.driverId?._id === driverTwo._id), "Operator job list missing second driver");
    return allocated;
  });

  const driverLogin = await step("driver login", () => request("POST", "/auth/login", { phone: driver.phone, password: "init@123" }));
  const driverToken = driverLogin.token;
  await step("driver mark attendance today", () => request("POST", "/driver/mark-attendance", { vehicleId: vehicle._id }, driverToken));
  await step("driver dashboard shows allocated job", async () => {
    const dashboard = await request("GET", "/driver/dashboard", null, driverToken);
    assert(dashboard.jobs?.some((item) => item._id === job._id), "Primary driver dashboard missing allocated job");
    assert(dashboard.jobs?.some((item) => item._id === adminJob._id), "Primary driver dashboard missing admin-created job");
    assert(dashboard.attendance?.vehicleId?._id === vehicle._id, "Primary driver attendance vehicle mismatch");
    return dashboard;
  });
  await step("driver jobs shows allocated job progress", async () => {
    const jobs = await request("GET", "/driver/jobs", null, driverToken);
    const allocated = jobs.find((item) => item._id === job._id);
    assert(allocated, "Primary driver jobs missing allocated job");
    assert(jobs.some((item) => item._id === adminJob._id), "Primary driver jobs missing admin-created job");
    assert(allocated.completedQuantity === 2, "Primary driver job progress mismatch");
    assert(allocated.progressLogs?.some((item) => item.driverId === driver._id && item.quantity === 2), "Primary driver job log missing selected driver");
    assert(allocated.requiredQuantity === 5, "Primary driver job quantity mismatch");
    return allocated;
  });
  await step("operator cannot delete jobs", async () => {
    try {
      await request("POST", `/operator/delete-job/${job._id}`, {}, operatorToken);
    } catch (error) {
      assert(error.message.includes("404"), "Operator delete attempt should be rejected");
      return true;
    }
    throw new Error("Operator delete unexpectedly succeeded");
  });
  await step("admin delete job", () => request("POST", `/admin/delete-job/${adminJob._id}`, {}, adminToken));
  await step("admin deleted job disappears from jobs and driver", async () => {
    const [adminJobs, driverJobs] = await Promise.all([
      request("GET", "/admin/jobs", null, adminToken),
      request("GET", "/driver/jobs", null, driverToken)
    ]);
    assert(!adminJobs.some((item) => item._id === adminJob._id), "Deleted job should not remain in admin jobs");
    assert(!driverJobs.some((item) => item._id === adminJob._id), "Deleted job should not remain visible to assigned driver");
    return true;
  });

  const driverTwoLogin = await step("second driver login", () => request("POST", "/auth/login", { phone: driverTwo.phone, password: "init@123" }));
  const driverTwoToken = driverTwoLogin.token;
  await step("second driver mark attendance today", () => request("POST", "/driver/mark-attendance", { vehicleId: vehicleTwo._id }, driverTwoToken));
  await step("second driver dashboard shows same allocated job", async () => {
    const dashboard = await request("GET", "/driver/dashboard", null, driverTwoToken);
    assert(dashboard.jobs?.some((item) => item._id === job._id), "Second driver dashboard missing allocated job");
    assert(dashboard.attendance?.vehicleId?._id === vehicleTwo._id, "Second driver attendance vehicle mismatch");
    return dashboard;
  });
  await step("second driver jobs shows same allocated job progress", async () => {
    const jobs = await request("GET", "/driver/jobs", null, driverTwoToken);
    const allocated = jobs.find((item) => item._id === job._id);
    assert(allocated, "Second driver jobs missing allocated job");
    assert(allocated.completedQuantity === 2, "Second driver job progress mismatch");
    assert(allocated.progressLogs?.some((item) => item.driverId === driver._id && item.quantity === 2), "Second driver job log missing selected driver");
    assert(allocated.assignments?.length === 2, "Second driver should see both job assignments");
    return allocated;
  });

  const expiredJob = await step("operator create expired job", () =>
    request(
      "POST",
      "/operator/create-job",
      {
        title: `Expired Smoke Job ${stamp}`,
        materialTypeId: material._id,
        requiredQuantity: 10,
        unit: "Dumper",
        startDate: "2026-05-01",
        endDate: "2026-05-02",
        sourceSiteId: holdingSite._id,
        destinationSiteId: tempSite._id,
        assignments: [{ driverId: driver._id, vehicleId: vehicle._id }]
      },
      operatorToken
    )
  );
  const expiredJobs = await step("admin expired jobs list", () => request("GET", "/admin/expired-jobs", null, adminToken));
  if (!expiredJobs.some((item) => item._id === expiredJob._id)) throw new Error("Created expired job was not listed");
  await step("admin edit expired job material", async () => {
    const updated = await request(
      "POST",
      `/admin/update-job/${expiredJob._id}`,
      { materialTypeId: editMaterial._id, unit: "Truckload", requiredQuantity: 12 },
      adminToken
    );
    assert(updated.materialName === editMaterial.name, "Expired job material should update");
    assert(updated.unit === "Truckload", "Expired job unit should update");
    assert(updated.requiredQuantity === 12, "Expired job required quantity should update");
    return updated;
  });
  await step("admin expired jobs list shows edited material", async () => {
    const rows = await request("GET", "/admin/expired-jobs", null, adminToken);
    const edited = rows.find((item) => item._id === expiredJob._id);
    assert(edited?.materialName === editMaterial.name, "Expired job list should show edited material");
    assert(edited?.requiredQuantity === 12, "Expired job list should show edited quantity");
    return edited;
  });
  await step("admin extend expired job to pending", async () => {
    const extended = await request("POST", `/admin/extend-job/${expiredJob._id}`, { startDate: "2026-06-08", endDate: "2026-06-09" }, adminToken);
    assert(extended.status === "pending", "Extended future job should be pending");
    return extended;
  });
  await step("admin delete extended pending job", () => request("POST", `/admin/delete-job/${expiredJob._id}`, {}, adminToken));
  await step("admin deleted pending job disappears", async () => {
    const rows = await request("GET", "/admin/jobs", null, adminToken);
    assert(!rows.some((item) => item._id === expiredJob._id), "Deleted pending job should not appear in admin jobs");
    return true;
  });

  await step("common lists", async () => {
    await request("GET", "/common/materials", null, adminToken);
    await request("GET", "/common/sites", null, adminToken);
    await request("GET", "/common/vehicles", null, adminToken);
    await request("GET", "/common/drivers", null, adminToken);
    await request("GET", "/common/alerts", null, adminToken);
  });

  console.log(JSON.stringify({ ok: true, stamp, checks: results }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, stamp, checks: results, error: error.message }, null, 2));
  process.exit(1);
}
