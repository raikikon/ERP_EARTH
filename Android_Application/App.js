import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const API_BASE_URL = "https://rsdcon.vercel.app/api";
const DEFAULT_LOGIN = { phone: "9999999999", password: "init@123" };
const EMPTY_DRIVER = { name: "", phone: "", address: "", govtIdNumber: "", aadharNumber: "", dlNumber: "", dlValidity: "", photoUrl: "", aadharPhotoUrl: "" };
const EMPTY_OPERATOR = { name: "", phone: "", address: "", photoUrl: "" };
const EMPTY_VEHICLE = { name: "", brand: "", model: "", type: "dumper", vehicleNumber: "", registrationNumber: "", registrationDate: "", photoUrl: "" };
const EMPTY_MATERIAL = { name: "", unitsText: "Dumper, Tonn, Cubic Meter" };
const EMPTY_SITE = { name: "", type: "holding", address: "", latitude: "", longitude: "", siteKeeperName: "", siteKeeperPhone: "" };
const EMPTY_SITE_MATERIAL = { materialTypeId: "", capacity: "", capacityUnit: "", currentStock: "0" };
const EMPTY_JOB = { title: "", materialTypeId: "", requiredQuantity: "", unit: "", startDate: "", endDate: "", sourceSiteId: "", destinationSiteId: "", assignments: [] };
const DOC_TYPES = ["fitness", "insurance", "rc", "puc", "roadTax", "other"];

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    AsyncStorage.multiGet(["erpToken", "erpUser"]).then((items) => {
      const savedToken = items[0]?.[1] || "";
      const savedUser = items[1]?.[1] ? JSON.parse(items[1][1]) : null;
      setToken(savedToken);
      setUser(savedUser);
      setBooting(false);
    });
  }, []);

  function notify(message) {
    setNotice(String(message || ""));
    windowSafeTimeout(() => setNotice(""), 3200);
  }

  async function onLogin(session) {
    await AsyncStorage.multiSet([
      ["erpToken", session.token],
      ["erpUser", JSON.stringify(session.user)]
    ]);
    setToken(session.token);
    setUser(session.user);
    setActive("dashboard");
  }

  async function logout() {
    await AsyncStorage.multiRemove(["erpToken", "erpUser"]);
    setToken("");
    setUser(null);
    setActive("dashboard");
  }

  if (booting) {
    return (
      <SafeArea>
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.muted}>Loading ERP session</Text>
        </View>
      </SafeArea>
    );
  }

  if (!token || !user) {
    return (
      <SafeArea>
        <Login onLogin={onLogin} notify={notify} />
        <Toast message={notice} />
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Shell user={user} active={active} setActive={setActive} logout={logout}>
        {user.role === "admin" && <Admin token={token} active={active} notify={notify} />}
        {user.role === "operator" && <Operator token={token} active={active} notify={notify} />}
        {user.role === "driver" && <Driver token={token} active={active} notify={notify} />}
      </Shell>
      <Toast message={notice} />
    </SafeArea>
  );
}

function SafeArea({ children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.forest} />
      {children}
    </SafeAreaView>
  );
}

function Shell({ user, active, setActive, logout, children }) {
  const nav = {
    admin: ["dashboard", "drivers", "operators", "vehicles", "materials", "sites", "jobs", "attendance", "alerts"],
    operator: ["dashboard", "jobs", "alerts"],
    driver: ["dashboard", "jobs", "attendance"]
  }[user.role];

  return (
    <View style={styles.app}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>Earth Soil ERP</Text>
          <Text style={styles.role}>{user.role} · {user.name}</Text>
        </View>
        <Button label="Logout" variant="light" onPress={logout} />
      </View>
      <View style={styles.navStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContent}>
          {nav.map((item) => (
            <Pressable key={item} onPress={() => setActive(item)} style={[styles.navItem, active === item && styles.navItemActive]}>
              <Text style={[styles.navText, active === item && styles.navTextActive]}>{title(item)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceContent}>
        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>{user.role}</Text>
          <Text style={styles.screenTitle}>{title(active)}</Text>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

function Login({ onLogin, notify }) {
  const [form, setForm] = useState(DEFAULT_LOGIN);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const data = await publicRequest("/auth/login", "POST", form);
      await onLogin(data);
    } catch (error) {
      notify(error.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.login}>
      <View style={styles.loginHero}>
        <Text style={styles.loginBrand}>Earth & Soil ERP</Text>
        <Text style={styles.loginTitle}>Operations login</Text>
        <Text style={styles.loginCopy}>Manage jobs, attendance, drivers, vehicles, material, sites and alerts from Android.</Text>
      </View>
      <Card>
        <Field label="Phone number" value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm({ ...form, phone })} />
        <Field label="Password" value={form.password} secureTextEntry onChangeText={(password) => setForm({ ...form, password })} />
        <Button label={busy ? "Signing in" : "Sign in"} onPress={submit} disabled={busy} />
      </Card>
    </ScrollView>
  );
}

function Admin({ token, active, notify }) {
  if (active === "dashboard") return <AdminDashboard token={token} />;
  if (active === "drivers") return <People token={token} role="driver" empty={EMPTY_DRIVER} notify={notify} />;
  if (active === "operators") return <People token={token} role="operator" empty={EMPTY_OPERATOR} notify={notify} />;
  if (active === "vehicles") return <Vehicles token={token} notify={notify} />;
  if (active === "materials") return <Materials token={token} notify={notify} />;
  if (active === "sites") return <Sites token={token} notify={notify} />;
  if (active === "jobs") return <AdminJobs token={token} notify={notify} />;
  if (active === "attendance") return <AdminAttendance token={token} notify={notify} />;
  return <Alerts token={token} />;
}

function Operator({ token, active, notify }) {
  if (active === "dashboard") return <OperatorDashboard token={token} notify={notify} />;
  if (active === "jobs") return <OperatorJobs token={token} notify={notify} />;
  return <Alerts token={token} />;
}

function Driver({ token, active, notify }) {
  if (active === "jobs") return <DriverJobs token={token} notify={notify} />;
  if (active === "attendance") return <DriverAttendance token={token} />;
  return <DriverDashboard token={token} notify={notify} />;
}

function AdminDashboard({ token }) {
  const { data, loading, reload } = useApi(token, async (api) => {
    const [stats, alerts] = await Promise.all([api.get("/admin/dashboard-stats"), api.get("/common/alerts")]);
    return { stats, alerts };
  });
  if (loading) return <Loader />;
  return (
    <Stack>
      <RefreshButton onPress={reload} />
      <View style={styles.metricGrid}>
        {Object.entries(data?.stats || {}).map(([key, value]) => <Metric key={key} label={title(key)} value={value} />)}
      </View>
      <Section title="Latest alerts">
        <RecordList rows={(data?.alerts || []).slice(0, 8)} fields={["severity", "title", "message", "dueDate"]} />
      </Section>
    </Stack>
  );
}

function People({ token, role, empty, notify }) {
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState(null);
  const base = role === "driver" ? "driver" : "operator";
  const endpoint = `/admin/${role}s`;
  const { data: rows = [], loading, reload } = useApi(token, (api) => api.get(endpoint), [role]);

  async function save() {
    const api = makeApi(token);
    const path = selected ? `/admin/update-${base}/${selected._id}` : `/admin/create-${base}`;
    await api.post(path, clean(form));
    setForm(empty);
    setSelected(null);
    notify(`${title(role)} saved`);
    reload();
  }

  async function remove(row) {
    const api = makeApi(token);
    await api.post(`/admin/delete-${base}/${row._id}`, {});
    notify(`${title(role)} deleted`);
    reload();
  }

  async function reset(row) {
    await makeApi(token).post(`/admin/reset-password/${row._id}`, {});
    notify("Password reset to init@123");
  }

  async function addDl() {
    if (!selected) return notify("Select a driver first");
    await makeApi(token).post(`/admin/update-driver-documents/${selected._id}`, {
      type: "drivingLicense",
      number: form.dlNumber,
      endDate: form.dlValidity,
      imageUrl: form.documentImage
    });
    notify("Driver DL uploaded");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title={`${selected ? "Edit" : "Add"} ${role}`}>
        <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm({ ...form, phone })} />
        <Field label="Address" value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
        <ImageField label="Photo" value={form.photoUrl} onChange={(photoUrl) => setForm({ ...form, photoUrl })} />
        {role === "driver" && (
          <>
            <Field label="Govt ID" value={form.govtIdNumber} onChangeText={(govtIdNumber) => setForm({ ...form, govtIdNumber })} />
            <Field label="Aadhar number" value={form.aadharNumber} onChangeText={(aadharNumber) => setForm({ ...form, aadharNumber })} />
            <ImageField label="Aadhar photo" value={form.aadharPhotoUrl} onChange={(aadharPhotoUrl) => setForm({ ...form, aadharPhotoUrl })} />
            <Field label="DL number" value={form.dlNumber} onChangeText={(dlNumber) => setForm({ ...form, dlNumber })} />
            <Field label="DL validity YYYY-MM-DD" value={form.dlValidity} onChangeText={(dlValidity) => setForm({ ...form, dlValidity })} />
            <ImageField label="DL upload" value={form.documentImage} onChange={(documentImage) => setForm({ ...form, documentImage })} />
          </>
        )}
        <Button label="Save" onPress={save} />
        {selected && <Button label="New" variant="light" onPress={() => { setSelected(null); setForm(empty); }} />}
        {role === "driver" && selected && <Button label="Add DL document" variant="gold" onPress={addDl} />}
      </FormCard>
      <Section title={`${title(role)} accounts`}>
        <RecordList
          rows={rows}
          fields={role === "driver" ? ["presentToday", "name", "phone", "dlNumber", "dlValidity"] : ["presentToday", "name", "phone", "address"]}
          mapRow={(row) => ({ ...row, presentToday: row.todayAttendance?.status || "absent" })}
          actions={(row) => (
            <View style={styles.rowActions}>
              <Button label="Open" size="small" variant="light" onPress={() => { setSelected(row); setForm({ ...empty, ...row, dlValidity: dateInput(row.dlValidity) }); }} />
              <Button label="Reset" size="small" variant="gold" onPress={() => reset(row)} />
              <Button label="Delete" size="small" variant="danger" onPress={() => remove(row)} />
            </View>
          )}
        />
      </Section>
    </Stack>
  );
}

function Vehicles({ token, notify }) {
  const [form, setForm] = useState(EMPTY_VEHICLE);
  const [selected, setSelected] = useState(null);
  const [doc, setDoc] = useState({ type: "fitness", number: "", startDate: "", endDate: "", imageUrl: "" });
  const { data: rows = [], loading, reload } = useApi(token, (api) => api.get("/admin/vehicles"));

  async function save() {
    const path = selected ? `/admin/update-vehicle/${selected._id}` : "/admin/create-vehicle";
    await makeApi(token).post(path, clean(form));
    setForm(EMPTY_VEHICLE);
    setSelected(null);
    notify("Vehicle saved");
    reload();
  }

  async function addDoc() {
    if (!selected) return notify("Open a vehicle first");
    await makeApi(token).post(`/admin/update-vehicle-documents/${selected._id}`, { ...doc, vehicleNumber: selected.vehicleNumber });
    setDoc({ type: "fitness", number: "", startDate: "", endDate: "", imageUrl: "" });
    notify("Vehicle document added");
    reload();
  }

  async function remove(row) {
    await makeApi(token).post(`/admin/delete-vehicle/${row._id}`, {});
    notify("Vehicle deleted");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title={`${selected ? "Edit" : "Add"} vehicle`}>
        {["name", "brand", "model", "type", "vehicleNumber", "registrationNumber", "registrationDate"].map((key) => (
          <Field key={key} label={title(key)} value={form[key]} onChangeText={(value) => setForm({ ...form, [key]: value })} />
        ))}
        <ImageField label="Vehicle photo" value={form.photoUrl} onChange={(photoUrl) => setForm({ ...form, photoUrl })} />
        <Button label="Save vehicle" onPress={save} />
      </FormCard>
      {selected && (
        <FormCard title={`Documents for ${selected.vehicleNumber}`}>
          <Select label="Document type" value={doc.type} options={DOC_TYPES} onChange={(type) => setDoc({ ...doc, type })} />
          <Field label="Document number" value={doc.number} onChangeText={(number) => setDoc({ ...doc, number })} />
          <Field label="Start date YYYY-MM-DD" value={doc.startDate} onChangeText={(startDate) => setDoc({ ...doc, startDate })} />
          <Field label="End date YYYY-MM-DD" value={doc.endDate} onChangeText={(endDate) => setDoc({ ...doc, endDate })} />
          <ImageField label="Upload document" value={doc.imageUrl} onChange={(imageUrl) => setDoc({ ...doc, imageUrl })} />
          <Button label="Add document" variant="gold" onPress={addDoc} />
        </FormCard>
      )}
      <Section title="Vehicles">
        <RecordList
          rows={rows}
          fields={["vehicleNumber", "name", "brand", "model", "type", "registrationNumber"]}
          actions={(row) => (
            <View style={styles.rowActions}>
              <Button label="Open" size="small" variant="light" onPress={() => { setSelected(row); setForm({ ...EMPTY_VEHICLE, ...row, registrationDate: dateInput(row.registrationDate) }); }} />
              <Button label="Delete" size="small" variant="danger" onPress={() => remove(row)} />
            </View>
          )}
        />
      </Section>
    </Stack>
  );
}

function Materials({ token, notify }) {
  const [form, setForm] = useState(EMPTY_MATERIAL);
  const { data: rows = [], loading, reload } = useApi(token, (api) => api.get("/common/materials"));

  async function save() {
    await makeApi(token).post("/admin/create-material", { name: form.name, units: splitUnits(form.unitsText) });
    setForm(EMPTY_MATERIAL);
    notify("Material saved");
    reload();
  }

  async function remove(row) {
    await makeApi(token).post(`/admin/delete-material/${row._id}`, {});
    notify("Material deleted");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title="Create material">
        <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field label="Units comma separated" value={form.unitsText} onChangeText={(unitsText) => setForm({ ...form, unitsText })} />
        <Button label="Save material" onPress={save} />
      </FormCard>
      <Section title="Materials">
        <RecordList rows={rows.map((row) => ({ ...row, units: row.units?.join(", ") }))} fields={["name", "units"]} actions={(row) => <Button label="Delete" size="small" variant="danger" onPress={() => remove(row)} />} />
      </Section>
    </Stack>
  );
}

function Sites({ token, notify }) {
  const [form, setForm] = useState(EMPTY_SITE);
  const [siteMaterials, setSiteMaterials] = useState([EMPTY_SITE_MATERIAL]);
  const [selected, setSelected] = useState(null);
  const { data, loading, reload } = useApi(token, async (api) => {
    const [sites, materials] = await Promise.all([api.get("/common/sites"), api.get("/common/materials")]);
    return { sites, materials };
  });
  const rows = data?.sites || [];
  const materials = data?.materials || [];

  function materialUnits(item) {
    const id = materialValue(item.materialTypeId);
    const material = materials.find((entry) => entry._id === id);
    return material?.units?.length ? material.units : ["Dumper", "Tonn", "Cubic Meter"];
  }

  function updateSiteMaterial(index, patch) {
    const next = [...siteMaterials];
    next[index] = { ...next[index], ...patch };
    setSiteMaterials(next);
  }

  async function save() {
    const payload = {
      ...clean(form),
      latitude: Number(form.latitude || 0),
      longitude: Number(form.longitude || 0),
      materials: siteMaterials.filter((item) => item.materialTypeId).map((item) => ({
        materialTypeId: item.materialTypeId,
        capacity: Number(item.capacity || 0),
        capacityUnit: item.capacityUnit,
        currentStock: Number(item.currentStock || 0)
      }))
    };
    await makeApi(token).post(selected ? `/admin/update-site/${selected._id}` : "/admin/create-site", payload);
    setForm(EMPTY_SITE);
    setSiteMaterials([EMPTY_SITE_MATERIAL]);
    setSelected(null);
    notify("Site saved");
    reload();
  }

  async function remove(row) {
    await makeApi(token).post(`/admin/delete-site/${row._id}`, {});
    notify("Site deleted");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title={`${selected ? "Edit" : "Add"} site`}>
        <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Select label="Type" value={form.type} options={["holding", "rcm", "temporary"]} onChange={(type) => setForm({ ...form, type })} />
        {["address", "latitude", "longitude", "siteKeeperName", "siteKeeperPhone"].map((key) => (
          <Field key={key} label={title(key)} value={form[key]} onChangeText={(value) => setForm({ ...form, [key]: value })} />
        ))}
        <Text style={styles.subheading}>Site materials</Text>
        {siteMaterials.map((item, index) => {
          const units = materialUnits(item);
          return (
            <View key={index} style={styles.softPanel}>
              <Select label="Material" value={item.materialTypeId} options={materials.map((m) => [m._id, m.name])} onChange={(materialTypeId) => updateSiteMaterial(index, { materialTypeId, capacityUnit: materialUnits({ materialTypeId })[0] || "" })} />
              <Field label="Capacity" value={String(item.capacity || "")} keyboardType="numeric" onChangeText={(capacity) => updateSiteMaterial(index, { capacity })} />
              <Select label="Unit" value={item.capacityUnit || units[0]} options={units} onChange={(capacityUnit) => updateSiteMaterial(index, { capacityUnit })} />
              <Field label="Current stock" value={String(item.currentStock || "")} keyboardType="numeric" onChangeText={(currentStock) => updateSiteMaterial(index, { currentStock })} />
            </View>
          );
        })}
        <Button label="Add material row" variant="light" onPress={() => setSiteMaterials([...siteMaterials, EMPTY_SITE_MATERIAL])} />
        <Button label="Save site" onPress={save} />
      </FormCard>
      <Section title="Sites">
        <RecordList
          rows={rows}
          fields={["name", "type", "address", "siteKeeperName", "siteKeeperPhone"]}
          actions={(row) => (
            <View style={styles.rowActions}>
              <Button label="Open" size="small" variant="light" onPress={() => {
                setSelected(row);
                setForm({ ...EMPTY_SITE, ...row });
                setSiteMaterials((row.materials || []).map((item) => ({ materialTypeId: materialValue(item.materialTypeId), capacity: String(item.capacity || ""), capacityUnit: item.capacityUnit || "", currentStock: String(item.currentStock || 0) })));
              }} />
              <Button label="Delete" size="small" variant="danger" onPress={() => remove(row)} />
            </View>
          )}
        />
      </Section>
    </Stack>
  );
}

function AdminJobs({ token, notify }) {
  const [form, setForm] = useState(EMPTY_JOB);
  const [dates, setDates] = useState({});
  const [jobEdits, setJobEdits] = useState({});
  const { data, loading, reload } = useApi(token, async (api) => {
    const [expired, all, materials, sites, drivers, vehicles] = await Promise.all([
      api.get("/admin/expired-jobs"),
      api.get("/admin/jobs"),
      api.get("/common/materials"),
      api.get("/common/sites"),
      api.get("/common/drivers"),
      api.get("/common/vehicles")
    ]);
    return { expired, all, materials, sites, drivers, vehicles };
  });
  const materials = data?.materials || [];
  const sites = data?.sites || [];
  const drivers = data?.drivers || [];
  const vehicles = data?.vehicles || [];

  async function createJob() {
    const material = materials.find((item) => item._id === form.materialTypeId);
    await makeApi(token).post("/admin/create-job", { ...clean(form), unit: form.unit || material?.units?.[0] || "Dumper", requiredQuantity: Number(form.requiredQuantity) });
    setForm(EMPTY_JOB);
    notify("Job created by administrator");
    reload();
  }

  async function deleteJob(row) {
    await makeApi(token).post(`/admin/delete-job/${row._id}`, {});
    notify("Job deleted");
    reload();
  }

  function editFor(job) {
    const patch = jobEdits[job._id] || {};
    const materialTypeId = patch.materialTypeId ?? materialValue(job.materialTypeId);
    const material = materials.find((item) => item._id === materialTypeId);
    const units = material?.units?.length ? material.units : [job.unit || "Dumper", "Tonn", "Cubic Meter"].filter(Boolean);
    return {
      materialTypeId,
      requiredQuantity: patch.requiredQuantity ?? String(job.requiredQuantity ?? ""),
      unit: patch.unit ?? job.unit ?? units[0],
      units
    };
  }

  function updateJobEdit(jobId, patch) {
    setJobEdits((current) => ({ ...current, [jobId]: { ...current[jobId], ...patch } }));
  }

  async function updateJobMaterial(job) {
    const edit = editFor(job);
    await makeApi(token).post(`/admin/update-job/${job._id}`, { materialTypeId: edit.materialTypeId, unit: edit.unit, requiredQuantity: Number(edit.requiredQuantity) });
    notify("Job material updated");
    reload();
  }

  async function extend(job) {
    await makeApi(token).post(`/admin/extend-job/${job._id}`, dates[job._id] || {});
    notify("Job extended and made live again");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title="Create job">
        <JobForm form={form} setForm={setForm} materials={materials} sites={sites} drivers={drivers} vehicles={vehicles} />
        <Button label="Create job" onPress={createJob} />
      </FormCard>
      <Section title="All jobs">
        <JobList jobs={data?.all || []} adminDelete={deleteJob} />
      </Section>
      <Section title="Expired and pending actions">
        {(data?.expired || []).map((job) => {
          const edit = editFor(job);
          return (
            <Card key={job._id}>
              <JobSummary job={job} />
              <Field label="New start date YYYY-MM-DD" value={dates[job._id]?.startDate || ""} onChangeText={(startDate) => setDates({ ...dates, [job._id]: { ...dates[job._id], startDate } })} />
              <Field label="New end date YYYY-MM-DD" value={dates[job._id]?.endDate || ""} onChangeText={(endDate) => setDates({ ...dates, [job._id]: { ...dates[job._id], endDate } })} />
              <Button label="Extend job" variant="gold" onPress={() => extend(job)} />
              <Select label="Material" value={edit.materialTypeId} options={materials.map((m) => [m._id, m.name])} onChange={(materialTypeId) => {
                const material = materials.find((item) => item._id === materialTypeId);
                updateJobEdit(job._id, { materialTypeId, unit: material?.units?.[0] || edit.unit });
              }} />
              <Select label="Unit" value={edit.unit} options={edit.units} onChange={(unit) => updateJobEdit(job._id, { unit })} />
              <Field label="Required quantity" value={String(edit.requiredQuantity)} keyboardType="numeric" onChangeText={(requiredQuantity) => updateJobEdit(job._id, { requiredQuantity })} />
              <Button label="Update material" variant="light" onPress={() => updateJobMaterial(job)} />
              <Button label="Delete job" variant="danger" onPress={() => deleteJob(job)} />
            </Card>
          );
        })}
        {!data?.expired?.length && <Text style={styles.muted}>No expired jobs right now.</Text>}
      </Section>
    </Stack>
  );
}

function OperatorDashboard({ token, notify }) {
  const { data = {}, loading, reload } = useApi(token, (api) => api.get("/operator/dashboard"));
  async function mark() {
    await makeApi(token).post("/operator/mark-attendance", {});
    notify("Attendance marked for today");
    reload();
  }
  if (loading) return <Loader />;
  return (
    <Stack>
      <Card>
        <Text style={styles.cardTitle}>Today attendance</Text>
        <Text style={styles.muted}>{data.attendanceMarked ? "Marked present" : "Not marked yet"}</Text>
        <Button label="Mark present" onPress={mark} disabled={data.attendanceMarked} />
      </Card>
      <Section title="Recent jobs"><JobList jobs={data.jobs || []} /></Section>
    </Stack>
  );
}

function OperatorJobs({ token, notify }) {
  const [form, setForm] = useState(EMPTY_JOB);
  const [progress, setProgress] = useState({});
  const { data, loading, reload } = useApi(token, async (api) => {
    const [jobs, materials, sites, drivers, vehicles] = await Promise.all([
      api.get("/operator/jobs"),
      api.get("/common/materials"),
      api.get("/common/sites"),
      api.get("/common/drivers"),
      api.get("/common/vehicles")
    ]);
    return { jobs, materials, sites, drivers, vehicles };
  });

  async function createJob() {
    const material = data?.materials?.find((item) => item._id === form.materialTypeId);
    await makeApi(token).post("/operator/create-job", { ...clean(form), unit: form.unit || material?.units?.[0] || "Dumper", requiredQuantity: Number(form.requiredQuantity) });
    setForm(EMPTY_JOB);
    notify("Job created");
    reload();
  }

  function progressFor(jobId) {
    return progress[jobId] || { driverId: "", quantity: "" };
  }

  async function addMaterial(job) {
    const entry = progressFor(job._id);
    await makeApi(token).post(`/operator/add-material/${job._id}`, { driverId: entry.driverId, quantity: Number(entry.quantity), unit: job.unit });
    setProgress((current) => ({ ...current, [job._id]: { driverId: "", quantity: "" } }));
    notify("Material added to job progress");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title="Create job">
        <JobForm form={form} setForm={setForm} materials={data.materials || []} sites={data.sites || []} drivers={data.drivers || []} vehicles={data.vehicles || []} />
        <Button label="Create job" onPress={createJob} />
      </FormCard>
      <Section title="Jobs">
        {(data.jobs || []).map((job) => {
          const entry = progressFor(job._id);
          return (
            <Card key={job._id}>
              <JobSummary job={job} />
              {job.status === "expired" ? (
                <Text style={styles.warningText}>Needs admin extension before progress can be added</Text>
              ) : (
                <>
                  <Select label="Which driver put material?" value={entry.driverId} options={(job.assignments || []).map((a) => [a.driverId?._id || a.driverId, a.driverName || a.driverId?.name || "Driver"])} onChange={(driverId) => setProgress((current) => ({ ...current, [job._id]: { ...entry, driverId } }))} />
                  <Field label={`Quantity ${job.unit || ""}`} value={entry.quantity} keyboardType="numeric" onChangeText={(quantity) => setProgress((current) => ({ ...current, [job._id]: { ...entry, quantity } }))} />
                  <Button label="Add material" onPress={() => addMaterial(job)} disabled={!entry.driverId || !entry.quantity} />
                </>
              )}
            </Card>
          );
        })}
      </Section>
    </Stack>
  );
}

function DriverDashboard({ token, notify }) {
  const [vehicleId, setVehicleId] = useState("");
  const { data, loading, reload } = useApi(token, async (api) => {
    const [dashboard, vehicles] = await Promise.all([api.get("/driver/dashboard"), api.get("/common/vehicles")]);
    return { dashboard, vehicles };
  });

  useEffect(() => {
    const id = data?.dashboard?.attendance?.vehicleId?._id;
    if (id) setVehicleId(id);
  }, [data?.dashboard?.attendance?.vehicleId?._id]);

  async function mark() {
    if (!vehicleId) return notify("Vehicle is required");
    await makeApi(token).post("/driver/mark-attendance", { vehicleId });
    notify("Driver attendance marked");
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <Card>
        <Text style={styles.cardTitle}>Today vehicle</Text>
        <Select label="Vehicle" value={vehicleId} options={(data?.vehicles || []).map((v) => [v._id, v.vehicleNumber])} onChange={setVehicleId} />
        <Button label="Mark attendance" onPress={mark} />
      </Card>
      <Section title="Alerts"><RecordList rows={data?.dashboard?.alerts || []} fields={["severity", "title", "message", "dueDate"]} /></Section>
      <Section title="Jobs"><JobList jobs={data?.dashboard?.jobs || []} /></Section>
    </Stack>
  );
}

function DriverJobs({ token, notify }) {
  const [dumps, setDumps] = useState({});
  const { data = [], loading, reload } = useApi(token, (api) => api.get("/driver/jobs"));

  function dumpFor(jobId) {
    return dumps[jobId] || { quantity: "", note: "" };
  }

  async function addDump(job) {
    const entry = dumpFor(job._id);
    try {
      await makeApi(token).post(`/driver/add-material/${job._id}`, {
        quantity: Number(entry.quantity),
        unit: job.unit,
        note: entry.note
      });
      setDumps((current) => ({ ...current, [job._id]: { quantity: "", note: "" } }));
      notify("Material dump added to job");
      reload();
    } catch (error) {
      notify(error.message || "Material dump update failed");
    }
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <RefreshButton onPress={reload} />
      <Section title="Assigned jobs">
        {data.map((job) => {
          const entry = dumpFor(job._id);
          const remaining = Math.max(0, Number(job.requiredQuantity || 0) - Number(job.completedQuantity || 0));
          const canDump = !["completed", "expired"].includes(job.status) && remaining > 0;
          return (
            <Card key={job._id}>
              <JobSummary job={job} />
              {canDump ? (
                <View style={styles.dumpPanel}>
                  <Text style={styles.subheading}>Dump material to site</Text>
                  <Text style={styles.muted}>Remaining: {remaining} {job.unit || ""}</Text>
                  <Field label={`Quantity ${job.unit || ""}`} value={entry.quantity} keyboardType="numeric" onChangeText={(quantity) => setDumps((current) => ({ ...current, [job._id]: { ...entry, quantity } }))} />
                  <Field label="Note" value={entry.note} onChangeText={(note) => setDumps((current) => ({ ...current, [job._id]: { ...entry, note } }))} />
                  <Button label="Add dump" onPress={() => addDump(job)} disabled={!entry.quantity || Number(entry.quantity) <= 0 || Number(entry.quantity) > remaining} />
                </View>
              ) : (
                <Text style={styles.warningText}>{job.status === "expired" ? "Needs admin extension before dumping material" : "Job material is complete"}</Text>
              )}
            </Card>
          );
        })}
        {!data.length && <Text style={styles.muted}>No assigned jobs yet.</Text>}
      </Section>
    </Stack>
  );
}

function DriverAttendance({ token }) {
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey());
  const { data = [], loading, reload } = useApi(token, (api) => api.get("/driver/attendance"));
  if (loading) return <Loader />;
  return (
    <Stack>
      <RefreshButton onPress={reload} />
      <AttendanceCalendar user={{ name: "Your attendance", role: "driver" }} rows={data} month={calendarMonth} setMonth={setCalendarMonth} />
      <Section title="Attendance records">
        <RecordList rows={data} fields={["date", "status", "checkInTime", "checkOutTime"]} />
      </Section>
    </Stack>
  );
}

function AdminAttendance({ token, notify }) {
  const [form, setForm] = useState({ userId: "", date: todayKey(), status: "present", vehicleId: "", checkInTime: "" });
  const [attendance, setAttendance] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey());
  const { data, loading, reload } = useApi(token, async (api) => {
    const [drivers, operators, vehicles] = await Promise.all([api.get("/admin/drivers"), api.get("/admin/operators"), api.get("/common/vehicles")]);
    return { drivers, operators, vehicles };
  });
  const users = [...(data?.drivers || []), ...(data?.operators || [])];
  const selectedUser = users.find((user) => user._id === form.userId);

  async function loadAttendance(userId = form.userId) {
    if (!userId) {
      setAttendance([]);
      return;
    }
    const history = await makeApi(token).get(`/admin/attendance/${userId}`);
    setAttendance(history.attendance || []);
  }

  async function save() {
    await makeApi(token).post("/admin/mark-attendance", form);
    notify("Attendance saved");
    loadAttendance();
    reload();
  }

  if (loading) return <Loader />;
  return (
    <Stack>
      <FormCard title="Mark or edit attendance">
        <Select label="User" value={form.userId} options={users.map((u) => [u._id, `${u.name} (${u.role})`])} onChange={(userId) => { setForm({ ...form, userId }); loadAttendance(userId); }} />
        <Field label="Date YYYY-MM-DD" value={form.date} onChangeText={(date) => { setForm({ ...form, date }); if (/^\d{4}-\d{2}/.test(date)) setCalendarMonth(date.slice(0, 7)); }} />
        <Select label="Status" value={form.status} options={["present", "absent"]} onChange={(status) => setForm({ ...form, status })} />
        <Select label="Vehicle" value={form.vehicleId} options={(data?.vehicles || []).map((v) => [v._id, v.vehicleNumber])} onChange={(vehicleId) => setForm({ ...form, vehicleId })} />
        <Button label="Save attendance" onPress={save} disabled={!form.userId} />
      </FormCard>
      <AttendanceCalendar user={selectedUser} rows={attendance} month={calendarMonth} setMonth={setCalendarMonth} />
      <Section title="Attendance history">
        <RecordList rows={attendance} fields={["date", "status", "vehicleId", "checkInTime"]} mapRow={(row) => ({ ...row, vehicleId: row.vehicleId?.vehicleNumber || "-" })} />
      </Section>
    </Stack>
  );
}

function AttendanceCalendar({ user, rows = [], month, setMonth }) {
  const months = [-1, 0, 1].map((offset) => addMonths(month, offset));
  const byDate = new Map(rows.map((row) => [dateInput(row.date) || row.date, row]));
  const visibleDates = months.flatMap((item) => calendarCells(item.key).filter((day) => day.date));
  const visibleKeys = new Set(visibleDates.map((day) => day.date));
  const present = rows.filter((row) => visibleKeys.has(dateInput(row.date) || row.date) && row.status === "present").length;
  const absent = rows.filter((row) => visibleKeys.has(dateInput(row.date) || row.date) && row.status === "absent").length;
  const unmarked = Math.max(visibleDates.length - present - absent, 0);
  return (
    <Section title="Attendance calendar">
      <Card>
        <View style={styles.calendarToolbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{user ? `${user.role} attendance` : "Select a user"}</Text>
            <Text style={styles.cardTitle}>{user?.name || "No user selected"}</Text>
          </View>
          <View style={styles.calendarButtons}>
            <Button label="<" size="small" variant="light" onPress={() => setMonth(addMonths(month, -1).key)} />
            <Text style={styles.monthPicker}>{addMonths(month, 0).label}</Text>
            <Button label=">" size="small" variant="light" onPress={() => setMonth(addMonths(month, 1).key)} />
          </View>
        </View>
        <View style={styles.attendanceSummary}>
          <SummaryPill label="Present" value={present} tone="present" />
          <SummaryPill label="Absent" value={absent} tone="absent" />
          <SummaryPill label="Unmarked" value={unmarked} tone="unmarked" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {months.map((item) => (
            <View key={item.key} style={[styles.monthCard, item.key === month && styles.monthCardCenter]}>
              <Text style={styles.monthTitle}>{item.label}</Text>
              <View style={styles.calendarWeekdays}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <Text key={day} style={styles.weekdayText}>{day}</Text>)}
              </View>
              <View style={styles.calendarGrid}>
                {calendarCells(item.key).map((day, index) => {
                  if (!day.date) return <View key={`empty-${index}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
                  const attendance = byDate.get(day.date);
                  const status = attendance?.status || "unmarked";
                  return (
                    <View key={day.date} style={[styles.dayCell, status === "present" && styles.dayPresent, status === "absent" && styles.dayAbsent, status === "unmarked" && styles.dayUnmarked]}>
                      <Text style={styles.dayNumber}>{day.label}</Text>
                      <Text style={styles.dayStatus}>{status === "present" ? "Present" : status === "absent" ? "Absent" : "No record"}</Text>
                      {attendance?.vehicleId?.vehicleNumber ? <Text style={styles.dayVehicle}>{attendance.vehicleId.vehicleNumber}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </Card>
    </Section>
  );
}

function SummaryPill({ label, value, tone }) {
  return (
    <View style={[styles.summaryPill, styles[`summary_${tone}`]]}>
      <Text style={styles.summaryNumber}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Alerts({ token }) {
  const { data = [], loading, reload } = useApi(token, (api) => api.get("/common/alerts"));
  if (loading) return <Loader />;
  return <Stack><RefreshButton onPress={reload} /><RecordList rows={data} fields={["severity", "targetType", "title", "message", "dueDate"]} /></Stack>;
}

function JobForm({ form, setForm, materials, sites, drivers, vehicles }) {
  const selectedMaterial = materials.find((item) => item._id === form.materialTypeId);
  const materialUnits = selectedMaterial?.units?.length ? selectedMaterial.units : ["Dumper", "Tonn", "Cubic Meter"];
  function patch(next) {
    setForm({ ...form, ...next });
  }
  function updateAssignment(index, next) {
    const assignments = [...form.assignments];
    assignments[index] = { ...assignments[index], ...next };
    patch({ assignments });
  }
  return (
    <>
      <Field label="Title" value={form.title} onChangeText={(title) => patch({ title })} />
      <Select label="Type of material" value={form.materialTypeId} options={materials.map((m) => [m._id, m.name])} onChange={(materialTypeId) => {
        const material = materials.find((item) => item._id === materialTypeId);
        patch({ materialTypeId, unit: material?.units?.[0] || "" });
      }} />
      <Select label="Unit" value={form.unit || materialUnits[0]} options={materialUnits} onChange={(unit) => patch({ unit })} />
      <Field label="Required quantity" value={form.requiredQuantity} keyboardType="numeric" onChangeText={(requiredQuantity) => patch({ requiredQuantity })} />
      <Field label="Start date YYYY-MM-DD" value={form.startDate} onChangeText={(startDate) => patch({ startDate })} />
      <Field label="End date YYYY-MM-DD" value={form.endDate} onChangeText={(endDate) => patch({ endDate })} />
      <Select label="From site" value={form.sourceSiteId} options={sites.map((s) => [s._id, `${s.name} (${s.type})`])} onChange={(sourceSiteId) => patch({ sourceSiteId })} />
      <Select label="To site" value={form.destinationSiteId} options={sites.map((s) => [s._id, `${s.name} (${s.type})`])} onChange={(destinationSiteId) => patch({ destinationSiteId })} />
      <Button label="Add driver" variant="light" onPress={() => patch({ assignments: [...form.assignments, { driverId: "", vehicleId: "" }] })} />
      {form.assignments.map((item, index) => (
        <View key={index} style={styles.softPanel}>
          <Select label="Driver" value={item.driverId} options={drivers.map((d) => [d._id, d.name])} onChange={(driverId) => updateAssignment(index, { driverId })} />
          <Select label="Vehicle" value={item.vehicleId} options={vehicles.map((v) => [v._id, v.vehicleNumber])} onChange={(vehicleId) => updateAssignment(index, { vehicleId })} />
        </View>
      ))}
    </>
  );
}

function JobList({ jobs = [], adminDelete }) {
  if (!jobs.length) return <Text style={styles.muted}>No jobs yet.</Text>;
  return jobs.map((job) => (
    <Card key={job._id}>
      <JobSummary job={job} />
      {adminDelete && <Button label="Delete job" variant="danger" onPress={() => adminDelete(job)} />}
    </Card>
  ));
}

function JobSummary({ job }) {
  const drivers = (job.assignments || []).map((a) => a.driverName || a.driverId?.name).filter(Boolean).join(", ");
  return (
    <View>
      <Text style={styles.cardTitle}>{job.title || job.materialName || "Job"}</Text>
      <Text style={styles.badge}>{job.status || "pending"}</Text>
      <Text style={styles.recordText}>Material: {job.materialName || job.materialTypeId?.name || "-"}</Text>
      <Text style={styles.recordText}>Route: {job.sourceSiteName || job.sourceSiteId?.name || "-"} to {job.destinationSiteName || job.destinationSiteId?.name || "-"}</Text>
      <Text style={styles.recordText}>Progress: {job.completedQuantity || 0}/{job.requiredQuantity || 0} {job.unit || ""}</Text>
      <Text style={styles.recordText}>Drivers: {drivers || "-"}</Text>
      <Text style={styles.recordText}>Dates: {dateInput(job.startDate)} to {dateInput(job.endDate)}</Text>
    </View>
  );
}

function RecordList({ rows = [], fields = [], actions, mapRow = (row) => row }) {
  if (!rows.length) return <Text style={styles.muted}>No records yet.</Text>;
  return (
    <View style={styles.records}>
      {rows.map((raw, index) => {
        const row = mapRow(raw);
        return (
          <Card key={raw._id || index} soft>
            {fields.map((field) => (
              <View key={field} style={styles.recordLine}>
                <Text style={styles.recordLabel}>{title(field)}</Text>
                <Text style={styles.recordText}>{formatCell(row[field])}</Text>
              </View>
            ))}
            {actions?.(raw)}
          </Card>
        );
      })}
    </View>
  );
}

function Section({ title: heading, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{heading}</Text>
      {children}
    </View>
  );
}

function FormCard({ title: heading, children }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{heading}</Text>
      {children}
    </Card>
  );
}

function Card({ children, soft }) {
  return <View style={[styles.card, soft && styles.cardSoft]}>{children}</View>;
}

function Stack({ children }) {
  return <View style={styles.stack}>{children}</View>;
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? 0}</Text>
    </View>
  );
}

function Loader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.teal} />
      <Text style={styles.muted}>Loading</Text>
    </View>
  );
}

function RefreshButton({ onPress }) {
  return <Button label="Refresh" variant="light" onPress={onPress} />;
}

function Field({ label, value, onChangeText, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value == null ? "" : String(value)}
        onChangeText={onChangeText}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

function Select({ label, value, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const normalized = options.map((item) => Array.isArray(item) ? { value: item[0], label: item[1] } : { value: item, label: title(item) });
  const selected = normalized.find((item) => String(item.value) === String(value));
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen(true)}>
        <Text style={styles.selectText}>{selected?.label || "Select"}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.cardTitle}>{label}</Text>
            <FlatList
              data={normalized}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.optionRow, String(item.value) === String(value) && styles.optionRowActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No options found.</Text>}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ImageField({ label, value, onChange }) {
  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow image access to upload documents.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.base64) onChange(`data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
  }
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {value ? <Image source={{ uri: value }} style={styles.preview} /> : null}
      <Button label={value ? "Change image" : "Pick image"} variant="light" onPress={pick} />
    </View>
  );
}

function Button({ label, onPress, variant = "primary", disabled, size = "normal" }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.button,
      styles[`button_${variant}`],
      size === "small" && styles.buttonSmall,
      disabled && styles.buttonDisabled,
      pressed && !disabled && styles.buttonPressed
    ]}>
      <Text style={[styles.buttonText, variant === "light" && styles.buttonTextDark, variant === "gold" && styles.buttonTextDark]}>{label}</Text>
    </Pressable>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

function useApi(token, loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const api = useMemo(() => makeApi(token), [token]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await loader(api));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token, ...deps]);

  if (error) {
    return {
      data,
      loading: false,
      error,
      reload: load
    };
  }
  return { data, loading, reload: load };
}

function makeApi(token) {
  return {
    get: (path) => request(path, "GET", undefined, token),
    post: (path, body) => request(path, "POST", body, token)
  };
}

async function publicRequest(path, method, body) {
  return request(path, method, body);
}

async function request(path, method = "GET", body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    throw new Error(data?.message || `${method} ${path} failed`);
  }
  return data;
}

function title(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value != null));
}

function splitUnits(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  };
}

function calendarCells(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => ({ date: "", label: "" }));
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ date: `${month}-${String(day).padStart(2, "0")}`, label: day });
  }
  return cells;
}

function materialValue(value) {
  return value ? (typeof value === "object" ? value._id || value.id || "" : value) : "";
}

function formatCell(value) {
  if (value == null || value === "") return "-";
  if (value?.__cell) return value.label;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return value.name || value.vehicleNumber || value._id || "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString();
  return String(value);
}

function windowSafeTimeout(fn, timeout) {
  return setTimeout(fn, timeout);
}

const colors = {
  forest: "#15372e",
  forest2: "#205846",
  teal: "#2f756c",
  amber: "#d7a13a",
  clay: "#b65c3b",
  page: "#f4f6f3",
  surface: "#ffffff",
  soft: "#f8faf8",
  line: "#dce6df",
  ink: "#17211d",
  muted: "#65756e"
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.forest,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
  },
  app: { flex: 1, backgroundColor: colors.page },
  topbar: {
    backgroundColor: colors.forest,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: { color: "#fff", fontSize: 20, fontWeight: "900" },
  role: { color: "#dceae2", marginTop: 4, fontSize: 12, fontWeight: "700" },
  navStrip: { backgroundColor: "#102820", paddingVertical: 10 },
  navContent: { paddingHorizontal: 12, gap: 8 },
  navItem: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  navItemActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  navText: { color: "#dceae2", fontWeight: "800" },
  navTextActive: { color: "#211c11" },
  workspace: { flex: 1 },
  workspaceContent: { padding: 16, paddingBottom: 36 },
  screenHeader: { marginBottom: 14 },
  eyebrow: { color: colors.teal, textTransform: "uppercase", fontSize: 11, fontWeight: "900", letterSpacing: 0 },
  screenTitle: { color: colors.ink, fontSize: 30, fontWeight: "900", marginTop: 2 },
  login: { flexGrow: 1, backgroundColor: colors.page, padding: 18, justifyContent: "center" },
  loginHero: { backgroundColor: colors.forest, borderRadius: 10, padding: 24, marginBottom: 14 },
  loginBrand: { color: "#dceae2", fontWeight: "900", marginBottom: 22 },
  loginTitle: { color: "#fff", fontSize: 36, fontWeight: "900" },
  loginCopy: { color: "#dceae2", marginTop: 10, lineHeight: 21 },
  stack: { gap: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 12 },
  cardSoft: { backgroundColor: colors.soft },
  cardTitle: { fontSize: 17, fontWeight: "900", color: colors.ink },
  subheading: { fontSize: 15, fontWeight: "900", color: colors.forest2 },
  field: { gap: 6 },
  softPanel: { backgroundColor: colors.soft, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.line, gap: 12 },
  label: { color: colors.forest2, fontWeight: "900", fontSize: 12 },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#c7d7cd", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 12, color: colors.ink },
  selectButton: { minHeight: 44, borderWidth: 1, borderColor: "#c7d7cd", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 12, justifyContent: "center" },
  selectText: { color: colors.ink, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "70%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 12 },
  optionRow: { paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionRowActive: { backgroundColor: "#eef4ef" },
  optionText: { color: colors.ink, fontWeight: "800" },
  button: { minHeight: 42, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10 },
  buttonSmall: { minHeight: 34, paddingVertical: 7, paddingHorizontal: 10 },
  button_primary: { backgroundColor: colors.forest2 },
  button_light: { backgroundColor: "#eef4ef", borderWidth: 1, borderColor: colors.line },
  button_gold: { backgroundColor: colors.amber },
  button_danger: { backgroundColor: colors.clay },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ translateY: 1 }] },
  buttonText: { color: "#fff", fontWeight: "900" },
  buttonTextDark: { color: colors.ink },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "47.5%", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 14 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  metricValue: { color: colors.ink, fontSize: 28, fontWeight: "900", marginTop: 8 },
  records: { gap: 10 },
  recordLine: { gap: 3 },
  recordLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  recordText: { color: colors.ink, fontWeight: "700", lineHeight: 20 },
  muted: { color: colors.muted, fontWeight: "700" },
  warningText: { color: colors.clay, fontWeight: "900" },
  dumpPanel: { marginTop: 4, backgroundColor: "#f8faf8", borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 },
  badge: { alignSelf: "flex-start", backgroundColor: "#eef4ef", color: colors.forest2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden", fontWeight: "900", marginVertical: 6 },
  calendarToolbar: { flexDirection: "row", alignItems: "center", gap: 10 },
  calendarButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthPicker: { minWidth: 112, textAlign: "center", color: colors.ink, fontWeight: "900" },
  attendanceSummary: { flexDirection: "row", gap: 8 },
  summaryPill: { flex: 1, borderRadius: 8, padding: 10, borderWidth: 1 },
  summary_present: { backgroundColor: "#eaf7ef", borderColor: "#bde3c8" },
  summary_absent: { backgroundColor: "#fff0ea", borderColor: "#efc3b6" },
  summary_unmarked: { backgroundColor: "#f5f6f4", borderColor: colors.line },
  summaryNumber: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase", marginTop: 2 },
  monthStrip: { gap: 12, paddingVertical: 2 },
  monthCard: { width: 310, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, backgroundColor: colors.soft },
  monthCardCenter: { borderColor: colors.amber, backgroundColor: "#fffaf0" },
  monthTitle: { color: colors.ink, fontWeight: "900", fontSize: 16, marginBottom: 8 },
  calendarWeekdays: { flexDirection: "row", marginBottom: 6 },
  weekdayText: { width: "14.285%", color: colors.muted, fontSize: 10, fontWeight: "900", textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.285%", minHeight: 58, borderRadius: 6, padding: 4, borderWidth: 1, borderColor: "transparent" },
  dayCellEmpty: { opacity: 0 },
  dayPresent: { backgroundColor: "#eaf7ef", borderColor: "#bde3c8" },
  dayAbsent: { backgroundColor: "#fff0ea", borderColor: "#efc3b6" },
  dayUnmarked: { backgroundColor: "#ffffff", borderColor: colors.line },
  dayNumber: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  dayStatus: { color: colors.muted, fontSize: 8, fontWeight: "800", marginTop: 2 },
  dayVehicle: { color: colors.teal, fontSize: 8, fontWeight: "900", marginTop: 2 },
  center: { flex: 1, backgroundColor: colors.page, justifyContent: "center", alignItems: "center", gap: 10 },
  toast: { position: "absolute", left: 16, right: 16, bottom: 18, backgroundColor: "#fff", borderLeftColor: colors.teal, borderLeftWidth: 5, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: colors.line },
  toastText: { color: colors.ink, fontWeight: "900" },
  preview: { width: "100%", height: 150, borderRadius: 8, backgroundColor: colors.soft }
});
