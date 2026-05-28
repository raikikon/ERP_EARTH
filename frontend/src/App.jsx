import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  CalendarCheck,
  Car,
  ClipboardList,
  Eye,
  Factory,
  Gauge,
  LogOut,
  Package,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
  X
} from 'lucide-react'
import './App.css'

const api = axios.create({ baseURL: '/api' })
const savedToken = localStorage.getItem('erpToken') || ''
if (savedToken) api.defaults.headers.common.Authorization = `Bearer ${savedToken}`

const defaultLogin = { email: 'admin@earthmovers.local', phone: '', password: 'init@123' }
const emptyDriver = { name: '', phone: '', email: '', address: '', govtIdNumber: '', aadharNumber: '', dlNumber: '', dlValidity: '', photoUrl: '', aadharPhotoUrl: '' }
const emptyOperator = { name: '', phone: '', email: '', address: '', photoUrl: '' }
const emptyVehicle = { name: '', brand: '', model: '', type: 'dumper', vehicleNumber: '', registrationNumber: '', registrationDate: '', photoUrl: '' }
const emptyMaterial = { name: '', unitsText: 'Dumper, Tonn, Cubic Meter' }
const emptySite = { name: '', type: 'holding', address: '', latitude: '', longitude: '', siteKeeperName: '', siteKeeperPhone: '' }
const emptySiteMaterial = { materialTypeId: '', capacity: '', capacityUnit: '', currentStock: 0 }
const emptyJob = { title: '', materialTypeId: '', requiredQuantity: '', unit: '', startDate: '', endDate: '', sourceSiteId: '', destinationSiteId: '', assignments: [] }
const docTypes = ['fitness', 'insurance', 'rc', 'puc', 'roadTax', 'other']

function App() {
  const [token, setToken] = useState(savedToken)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('erpUser') || 'null'))
  const [active, setActive] = useState('dashboard')
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : ''
  }, [token])

  function onLogin(session) {
    localStorage.setItem('erpToken', session.token)
    localStorage.setItem('erpUser', JSON.stringify(session.user))
    api.defaults.headers.common.Authorization = `Bearer ${session.token}`
    setToken(session.token)
    setUser(session.user)
    setActive('dashboard')
  }

  function notify(message, variant) {
    if (!message) return
    const normalized = String(message)
    const id = `${Date.now()}-${Math.random()}`
    const type = variant || (/(failed|required|invalid|error)/i.test(normalized) ? 'error' : 'success')
    setToasts((current) => [...current.slice(-3), { id, message: normalized, type }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3600)
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function logout() {
    localStorage.clear()
    delete api.defaults.headers.common.Authorization
    setToken('')
    setUser(null)
  }

  if (!token || !user) {
    return (
      <>
        <Login onLogin={onLogin} setNotice={notify} />
        <ToastStack toasts={toasts} dismiss={dismissToast} />
      </>
    )
  }

  return (
    <>
      <Shell user={user} active={active} setActive={setActive} logout={logout}>
        {user.role === 'admin' && <Admin active={active} setNotice={notify} />}
        {user.role === 'operator' && <Operator active={active} setNotice={notify} />}
        {user.role === 'driver' && <Driver active={active} setNotice={notify} />}
      </Shell>
      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </>
  )
}

function ToastStack({ toasts, dismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          <span>{toast.message}</span>
          <button title="Dismiss" onClick={() => dismiss(toast.id)}><X size={16} /></button>
        </div>
      ))}
    </div>
  )
}

function Login({ onLogin, setNotice }) {
  const [form, setForm] = useState(defaultLogin)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', form)
      onLogin(data)
    } catch (error) {
      setNotice(error.response?.data?.message || 'Login failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <section className="login-media" aria-hidden="true">
        <div className="excavator-scene">
          <div className="sun" />
          <div className="soil ridge-a" />
          <div className="soil ridge-b" />
          <div className="truck">
            <span />
            <i />
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="brand-row">
          <Factory size={30} />
          <strong>Earth & Soil ERP</strong>
        </div>
        <h1>Operations login</h1>
        <p className="muted">Manage material movement, vehicles, drivers, documents, attendance, and expired job approvals.</p>
        <form onSubmit={submit} className="form stack">
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value, phone: '' })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value, email: '' })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary" disabled={busy}><ShieldCheck size={18} />{busy ? 'Signing in' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}

function Shell({ user, active, setActive, logout, children }) {
  const nav = {
    admin: [['dashboard', Gauge], ['drivers', Users], ['operators', UserCog], ['vehicles', Car], ['materials', Package], ['sites', Factory], ['jobs', Briefcase], ['attendance', CalendarCheck], ['alerts', AlertTriangle]],
    operator: [['dashboard', Gauge], ['jobs', Briefcase], ['alerts', AlertTriangle]],
    driver: [['dashboard', Gauge], ['jobs', Briefcase], ['attendance', CalendarCheck]]
  }[user.role]

  return (
    <div className="app-shell">
      <aside>
        <div className="brand-row"><Factory size={26} /><strong>Earth ERP</strong></div>
        <nav>
          {nav.map(([key, Icon]) => (
            <button className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)} title={key}>
              <Icon size={18} /><span>{title(key)}</span>
            </button>
          ))}
        </nav>
        <button className="ghost" onClick={logout}><LogOut size={18} />Logout</button>
      </aside>
      <main className="workspace">
        <header>
          <div>
            <p className="eyebrow">{user.role}</p>
            <h1>{title(active)}</h1>
          </div>
          <div className="user-chip">{user.name}</div>
        </header>
        {children}
      </main>
    </div>
  )
}

function Admin({ active, setNotice }) {
  if (active === 'dashboard') return <AdminDashboard />
  if (active === 'drivers') return <People role="driver" empty={emptyDriver} setNotice={setNotice} />
  if (active === 'operators') return <People role="operator" empty={emptyOperator} setNotice={setNotice} />
  if (active === 'vehicles') return <Vehicles setNotice={setNotice} />
  if (active === 'materials') return <Materials setNotice={setNotice} />
  if (active === 'sites') return <Sites setNotice={setNotice} />
  if (active === 'jobs') return <AdminJobs setNotice={setNotice} />
  if (active === 'attendance') return <AdminAttendance setNotice={setNotice} />
  return <Alerts />
}

function Operator({ active, setNotice }) {
  if (active === 'dashboard') return <OperatorDashboard setNotice={setNotice} />
  if (active === 'jobs') return <OperatorJobs setNotice={setNotice} />
  return <Alerts />
}

function Driver({ active, setNotice }) {
  if (active === 'jobs') return <DriverJobs />
  if (active === 'attendance') return <DriverAttendance />
  return <DriverDashboard setNotice={setNotice} />
}

function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [alerts, setAlerts] = useState([])
  async function load() {
    const [s, a] = await Promise.all([api.get('/admin/dashboard-stats'), api.get('/common/alerts')])
    setStats(s.data)
    setAlerts(a.data)
  }
  useEffect(() => { load() }, [])
  return (
    <div className="stack">
      <div className="stats">
        {Object.entries(stats).map(([key, value]) => <Metric key={key} label={title(key)} value={value} />)}
      </div>
      <DataTable rows={alerts.slice(0, 8)} columns={['severity', 'title', 'message', 'dueDate']} />
    </div>
  )
}

function People({ role, empty, setNotice }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(empty)
  const [selected, setSelected] = useState(null)
  const base = role === 'driver' ? 'driver' : 'operator'
  async function load() { setRows((await api.get(`/admin/${role}s`)).data) }
  useEffect(() => {
    api.get(`/admin/${role}s`).then((response) => setRows(response.data))
  }, [role])
  async function save() {
    const path = selected ? `/admin/update-${base}/${selected._id}` : `/admin/create-${base}`
    await api.post(path, clean(form))
    setForm(empty); setSelected(null); setNotice(`${title(role)} saved`); load()
  }
  async function remove(id) { await api.post(`/admin/delete-${base}/${id}`); setNotice(`${title(role)} deleted`); load() }
  async function reset(id) { await api.post(`/admin/reset-password/${id}`); setNotice('Password reset to init@123') }
  async function addDocument() {
    if (!selected) return
    await api.post(`/admin/update-driver-documents/${selected._id}`, { type: 'drivingLicense', number: form.dlNumber, endDate: form.dlValidity, imageUrl: form.documentImage })
    setNotice('Driver document uploaded'); load()
  }
  return (
    <div className="two-col">
      <section className="panel">
        <PanelTitle icon={role === 'driver' ? Users : UserCog} text={`${selected ? 'Edit' : 'Add'} ${role}`} />
        <UserForm form={form} setForm={setForm} role={role} />
        <div className="actions">
          <button className="primary" onClick={save}><Save size={16} />Save</button>
          {selected && <button className="ghost" onClick={() => { setSelected(null); setForm(empty) }}>New</button>}
          {role === 'driver' && selected && <button className="secondary" onClick={addDocument}><Upload size={16} />Add DL</button>}
        </div>
      </section>
      <section className="panel wide">
        <DataTable
          rows={rows.map((row) => ({ ...row, presentToday: presenceCell(row.todayAttendance) }))}
          columns={['presentToday', 'name', 'phone', 'email', role === 'driver' ? 'dlNumber' : 'address', role === 'driver' ? 'dlValidity' : 'createdAt']}
          actions={(row) => (
            <>
              <IconButton title="View profile" onClick={() => { setSelected(row); setForm({ ...empty, ...row, dlValidity: dateInput(row.dlValidity) }) }} icon={Eye} />
              <IconButton title="Reset password" onClick={() => reset(row._id)} icon={RefreshCcw} />
              <IconButton title="Delete" onClick={() => remove(row._id)} icon={Trash2} />
            </>
          )}
        />
        {selected && <Profile entity={selected} />}
      </section>
    </div>
  )
}

function UserForm({ form, setForm, role }) {
  return (
    <div className="form grid">
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
      <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <ImageField label="Photo" onChange={(v) => setForm({ ...form, photoUrl: v })} />
      {role === 'driver' && <>
        <Field label="Govt ID" value={form.govtIdNumber} onChange={(v) => setForm({ ...form, govtIdNumber: v })} />
        <Field label="Aadhar number" value={form.aadharNumber} onChange={(v) => setForm({ ...form, aadharNumber: v })} />
        <ImageField label="Aadhar photo" onChange={(v) => setForm({ ...form, aadharPhotoUrl: v })} />
        <Field label="DL number" value={form.dlNumber} onChange={(v) => setForm({ ...form, dlNumber: v })} />
        <Field label="DL validity" type="date" value={form.dlValidity} onChange={(v) => setForm({ ...form, dlValidity: v })} />
        <ImageField label="DL upload" onChange={(v) => setForm({ ...form, documentImage: v })} />
      </>}
    </div>
  )
}

function Vehicles({ setNotice }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyVehicle)
  const [selected, setSelected] = useState(null)
  const [doc, setDoc] = useState({ type: 'fitness', number: '', startDate: '', endDate: '', imageUrl: '' })
  async function load() { setRows((await api.get('/admin/vehicles')).data) }
  useEffect(() => { load() }, [])
  async function save() {
    await api.post(selected ? `/admin/update-vehicle/${selected._id}` : '/admin/create-vehicle', clean(form))
    setForm(emptyVehicle); setSelected(null); setNotice('Vehicle saved'); load()
  }
  async function addDoc() {
    await api.post(`/admin/update-vehicle-documents/${selected._id}`, { ...doc, vehicleNumber: selected.vehicleNumber })
    setDoc({ type: 'fitness', number: '', startDate: '', endDate: '', imageUrl: '' }); setNotice('Vehicle document added'); load()
  }
  async function remove(id) { await api.post(`/admin/delete-vehicle/${id}`); load() }
  return (
    <div className="two-col">
      <section className="panel">
        <PanelTitle icon={Car} text={`${selected ? 'Edit' : 'Add'} vehicle`} />
        <div className="form grid">
          {['name', 'brand', 'model', 'type', 'vehicleNumber', 'registrationNumber'].map((key) => <Field key={key} label={title(key)} value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />)}
          <Field label="Registration date" type="date" value={form.registrationDate} onChange={(v) => setForm({ ...form, registrationDate: v })} />
          <ImageField label="Vehicle photo" onChange={(v) => setForm({ ...form, photoUrl: v })} />
        </div>
        <button className="primary" onClick={save}><Save size={16} />Save</button>
      </section>
      <section className="panel wide">
        <DataTable rows={rows} columns={['vehicleNumber', 'name', 'brand', 'model', 'type', 'registrationNumber']} actions={(row) => (
          <>
            <IconButton title="Open" onClick={() => { setSelected(row); setForm({ ...emptyVehicle, ...row, registrationDate: dateInput(row.registrationDate) }) }} icon={Eye} />
            <IconButton title="Delete" onClick={() => remove(row._id)} icon={Trash2} />
          </>
        )} />
        {selected && <DocumentEditor doc={doc} setDoc={setDoc} addDoc={addDoc} docs={selected.documents} />}
      </section>
    </div>
  )
}

function Materials({ setNotice }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyMaterial)
  async function load() { setRows((await api.get('/common/materials')).data) }
  useEffect(() => { load() }, [])
  async function save() {
    await api.post('/admin/create-material', { name: form.name, units: splitUnits(form.unitsText) })
    setForm(emptyMaterial); setNotice('Material saved'); load()
  }
  async function remove(id) { await api.post(`/admin/delete-material/${id}`); load() }
  return (
    <div className="two-col">
      <section className="panel">
        <PanelTitle icon={Package} text="Create material" />
        <Field label="Material name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Units" value={form.unitsText} onChange={(v) => setForm({ ...form, unitsText: v })} />
        <button className="primary" onClick={save}><Plus size={16} />Add</button>
      </section>
      <section className="panel wide">
        <DataTable rows={rows.map((r) => ({ ...r, units: r.units?.join(', ') }))} columns={['name', 'units']} actions={(row) => <IconButton title="Delete" onClick={() => remove(row._id)} icon={Trash2} />} />
      </section>
    </div>
  )
}

function Sites({ setNotice }) {
  const [rows, setRows] = useState([])
  const [materials, setMaterials] = useState([])
  const [form, setForm] = useState(emptySite)
  const [siteMaterials, setSiteMaterials] = useState([emptySiteMaterial])
  const [selected, setSelected] = useState(null)
  async function load() {
    const [s, m] = await Promise.all([api.get('/common/sites'), api.get('/common/materials')])
    setRows(s.data); setMaterials(m.data)
  }
  useEffect(() => { load() }, [])
  async function save() {
    const payload = {
      ...clean(form),
      materials: siteMaterials
        .map((item) => ({ ...item, materialTypeId: materialValue(item.materialTypeId), capacityUnit: item.capacityUnit || materialUnits(item)[0] || '' }))
        .filter((item) => item.materialTypeId)
    }
    await api.post(selected ? `/admin/update-site/${selected._id}` : '/admin/create-site', payload)
    setForm(emptySite); setSiteMaterials([emptySiteMaterial]); setSelected(null); setNotice('Site saved'); load()
  }
  function addSiteMaterial() { setSiteMaterials([...siteMaterials, emptySiteMaterial]) }
  function updateSiteMaterial(index, patch) {
    const next = [...siteMaterials]
    next[index] = { ...next[index], ...patch }
    setSiteMaterials(next)
  }
  function removeSiteMaterial(index) {
    const next = siteMaterials.filter((_, rowIndex) => rowIndex !== index)
    setSiteMaterials(next.length ? next : [emptySiteMaterial])
  }
  function materialUnits(item) {
    const material = materials.find((entry) => entry._id === materialValue(item.materialTypeId))
    return material?.units?.length ? material.units : ['Dumper', 'Tonn', 'Cubic Meter']
  }
  function openSite(row) {
    setSelected(row)
    setForm({ ...emptySite, ...row })
    const normalized = (row.materials || []).map((item) => ({
      materialTypeId: materialValue(item.materialTypeId),
      capacity: item.capacity ?? '',
      capacityUnit: item.capacityUnit || '',
      currentStock: item.currentStock ?? 0
    }))
    setSiteMaterials(normalized.length ? normalized : [emptySiteMaterial])
  }
  return (
    <div className="two-col">
      <section className="panel">
        <PanelTitle icon={Factory} text={`${selected ? 'Edit' : 'Add'} site`} />
        <div className="form grid">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Select label="Type" value={form.type} options={['holding', 'rcm', 'temporary']} onChange={(v) => setForm({ ...form, type: v })} />
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="Latitude" value={form.latitude} onChange={(v) => setForm({ ...form, latitude: v })} />
          <Field label="Longitude" value={form.longitude} onChange={(v) => setForm({ ...form, longitude: v })} />
          <Field label="Keeper name" value={form.siteKeeperName} onChange={(v) => setForm({ ...form, siteKeeperName: v })} />
          <Field label="Keeper phone" value={form.siteKeeperPhone} onChange={(v) => setForm({ ...form, siteKeeperPhone: v })} />
        </div>
        <div className="site-materials">
          <div className="section-head">
            <h2>Site materials</h2>
            <button className="secondary" onClick={addSiteMaterial}><Plus size={16} />Material</button>
          </div>
          {siteMaterials.map((item, index) => {
            const units = materialUnits(item)
            return (
              <div className="site-material-row" key={index}>
                <Select
                  label="Material"
                  value={materialValue(item.materialTypeId)}
                  options={materials.map((m) => [m._id, m.name])}
                  onChange={(value) => updateSiteMaterial(index, { materialTypeId: value, capacityUnit: materialUnits({ materialTypeId: value })[0] || '' })}
                />
                <Field label="Capacity" type="number" value={item.capacity} onChange={(value) => updateSiteMaterial(index, { capacity: value })} />
                <Select label="Unit" value={item.capacityUnit || units[0]} options={units} onChange={(value) => updateSiteMaterial(index, { capacityUnit: value })} />
                <Field label="Current stock" type="number" value={item.currentStock} onChange={(value) => updateSiteMaterial(index, { currentStock: value })} />
                <button className="icon-btn remove-row" title="Remove material" onClick={() => removeSiteMaterial(index)}><Trash2 size={16} /></button>
              </div>
            )
          })}
        </div>
        <button className="primary" onClick={save}><Save size={16} />Save</button>
      </section>
      <section className="panel wide">
        <DataTable rows={rows} columns={['name', 'type', 'address', 'siteKeeperName', 'siteKeeperPhone']} actions={(row) => <IconButton title="Open" onClick={() => openSite(row)} icon={Eye} />} />
      </section>
    </div>
  )
}

function OperatorJobs({ setNotice }) {
  const [jobs, setJobs] = useState([])
  const [materials, setMaterials] = useState([])
  const [sites, setSites] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(emptyJob)
  async function load() {
    const [j, m, s, d, v] = await Promise.all([api.get('/operator/jobs'), api.get('/common/materials'), api.get('/common/sites'), api.get('/common/drivers'), api.get('/common/vehicles')])
    setJobs(j.data); setMaterials(m.data); setSites(s.data); setDrivers(d.data); setVehicles(v.data)
  }
  useEffect(() => { load() }, [])
  async function createJob() {
    const material = materials.find((item) => item._id === form.materialTypeId)
    await api.post('/operator/create-job', {
      ...clean(form),
      unit: form.unit || material?.units?.[0] || 'Dumper',
      requiredQuantity: Number(form.requiredQuantity)
    })
    setForm(emptyJob); setNotice('Job created'); load()
  }
  async function addMaterial(job, entry) {
    try {
      await api.post(`/operator/add-material/${job._id}`, {
        driverId: entry.driverId,
        quantity: Number(entry.quantity),
        unit: entry.unit || job.unit
      })
      setNotice('Material added to job progress')
      load()
      return true
    } catch (error) {
      setNotice(error.response?.data?.message || 'Material progress update failed', 'error')
      return false
    }
  }
  function addAssignment() { setForm({ ...form, assignments: [...form.assignments, { driverId: '', vehicleId: '' }] }) }
  return (
    <div className="stack">
      <section className="panel">
        <PanelTitle icon={Briefcase} text="Create job" />
        <JobForm form={form} setForm={setForm} materials={materials} sites={sites} drivers={drivers} vehicles={vehicles} addAssignment={addAssignment} />
        <button className="primary" onClick={createJob}><Plus size={16} />Create job</button>
      </section>
      <JobTable jobs={jobs} addMaterial={addMaterial} />
    </div>
  )
}

function AdminJobs({ setNotice }) {
  const [jobs, setJobs] = useState([])
  const [dates, setDates] = useState({})
  async function load() { setJobs((await api.get('/admin/expired-jobs')).data) }
  useEffect(() => { load() }, [])
  async function extend(job) {
    await api.post(`/admin/extend-job/${job._id}`, dates[job._id])
    setNotice('Job extended and made live again'); load()
  }
  return (
    <section className="panel">
      <PanelTitle icon={Briefcase} text="Expired jobs needing admin approval" />
      <DataTable rows={jobs} columns={['materialName', 'sourceSiteName', 'destinationSiteName', 'requiredQuantity', 'completedQuantity', 'endDate']} actions={(job) => (
        <div className="inline-form">
          <input type="date" onChange={(e) => setDates({ ...dates, [job._id]: { ...dates[job._id], startDate: e.target.value } })} />
          <input type="date" onChange={(e) => setDates({ ...dates, [job._id]: { ...dates[job._id], endDate: e.target.value } })} />
          <IconButton title="Extend" onClick={() => extend(job)} icon={Save} />
        </div>
      )} />
    </section>
  )
}

function JobForm({ form, setForm, materials, sites, drivers, vehicles, addAssignment }) {
  const selectedMaterial = materials.find((item) => item._id === form.materialTypeId)
  const materialUnits = selectedMaterial?.units?.length ? selectedMaterial.units : ['Dumper', 'Tonn', 'Cubic Meter']
  function selectMaterial(materialTypeId) {
    const material = materials.find((item) => item._id === materialTypeId)
    setForm({ ...form, materialTypeId, unit: material?.units?.[0] || '' })
  }
  return (
    <div className="form grid">
      <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <div className="job-material-picker">
        <label>Type of material
          <select value={form.materialTypeId || ''} onChange={(event) => selectMaterial(event.target.value)}>
            <option value="">{materials.length ? 'Select material type' : 'No material types found'}</option>
            {materials.map((material) => <option key={material._id} value={material._id}>{material.name}</option>)}
          </select>
        </label>
        <Select label="Unit" value={form.unit || materialUnits[0]} options={materialUnits} onChange={(v) => setForm({ ...form, unit: v })} />
      </div>
      <Field label="Required quantity" type="number" value={form.requiredQuantity} onChange={(v) => setForm({ ...form, requiredQuantity: v })} />
      <Field label="Start date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
      <Field label="End date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
      <Select label="From site" value={form.sourceSiteId} options={sites.map((s) => [s._id, `${s.name} (${s.type})`])} onChange={(v) => setForm({ ...form, sourceSiteId: v })} />
      <Select label="To site" value={form.destinationSiteId} options={sites.map((s) => [s._id, `${s.name} (${s.type})`])} onChange={(v) => setForm({ ...form, destinationSiteId: v })} />
      <button className="secondary" onClick={addAssignment} type="button"><Plus size={16} />Driver</button>
      {form.assignments.map((item, index) => (
        <div className="inline-form" key={index}>
          <select value={item.driverId} onChange={(e) => updateArray(form.assignments, (assignments) => setForm({ ...form, assignments }), index, 'driverId', e.target.value)}>
            <option value="">Driver</option>
            {drivers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={item.vehicleId} onChange={(e) => updateArray(form.assignments, (assignments) => setForm({ ...form, assignments }), index, 'vehicleId', e.target.value)}>
            <option value="">Vehicle</option>
            {vehicles.map((v) => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function OperatorDashboard({ setNotice }) {
  const [data, setData] = useState({})
  useEffect(() => { api.get('/operator/dashboard').then((r) => setData(r.data)) }, [])
  async function mark() {
    const res = await api.post('/operator/mark-attendance', {})
    setData({ ...data, attendanceMarked: true, attendance: res.data })
    setNotice('Attendance marked for today')
  }
  return (
    <div className="stack">
      <section className="panel split">
        <div><h2>Today attendance</h2><p className="muted">{data.attendanceMarked ? 'Marked present' : 'Not marked yet'}</p></div>
        <button className="primary" onClick={mark} disabled={data.attendanceMarked}><CalendarCheck size={16} />Mark present</button>
      </section>
      <JobTable jobs={data.jobs || []} />
    </div>
  )
}

function DriverDashboard({ setNotice }) {
  const [data, setData] = useState({})
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState('')
  async function load() {
    const [d, v] = await Promise.all([api.get('/driver/dashboard'), api.get('/common/vehicles')])
    setData(d.data); setVehicles(v.data); setVehicleId(d.data.attendance?.vehicleId?._id || '')
  }
  useEffect(() => { load() }, [])
  async function mark() {
    if (!vehicleId) return setNotice('Vehicle is required')
    await api.post('/driver/mark-attendance', { vehicleId })
    setNotice('Driver attendance marked'); load()
  }
  return (
    <div className="stack">
      <section className="panel split">
        <div>
          <h2>Today vehicle</h2>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
          </select>
        </div>
        <button className="primary" onClick={mark}><CalendarCheck size={16} />Mark attendance</button>
      </section>
      <DataTable rows={data.alerts || []} columns={['severity', 'title', 'message', 'dueDate']} />
      <JobTable jobs={data.jobs || []} />
    </div>
  )
}

function DriverJobs() {
  const [jobs, setJobs] = useState([])
  useEffect(() => { api.get('/driver/jobs').then((r) => setJobs(r.data)) }, [])
  return <JobTable jobs={jobs} />
}

function DriverAttendance() {
  const [rows, setRows] = useState([])
  useEffect(() => { api.get('/driver/attendance').then((r) => setRows(r.data)) }, [])
  return <section className="panel"><DataTable rows={rows} columns={['date', 'status', 'checkInTime', 'checkOutTime']} /></section>
}

function AdminAttendance({ setNotice }) {
  const [drivers, setDrivers] = useState([])
  const [operators, setOperators] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({ userId: '', date: new Date().toISOString().slice(0, 10), status: 'present', vehicleId: '', checkInTime: '' })
  const [attendanceRows, setAttendanceRows] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(currentMonthKey())
  const users = [...drivers, ...operators]
  const selectedUser = users.find((user) => user._id === form.userId)
  useEffect(() => { Promise.all([api.get('/admin/drivers'), api.get('/admin/operators'), api.get('/common/vehicles')]).then(([d, o, v]) => { setDrivers(d.data); setOperators(o.data); setVehicles(v.data) }) }, [])
  useEffect(() => {
    if (!form.userId) {
      setAttendanceRows([])
      return
    }
    api.get(`/admin/attendance/${form.userId}`).then((response) => setAttendanceRows(response.data.attendance || []))
  }, [form.userId])
  async function save() {
    await api.post('/admin/mark-attendance', form)
    if (form.userId) {
      const response = await api.get(`/admin/attendance/${form.userId}`)
      setAttendanceRows(response.data.attendance || [])
    }
    setNotice('Attendance saved')
  }
  return (
    <div className="stack">
      <section className="panel">
        <PanelTitle icon={CalendarCheck} text="Mark or edit attendance" />
        <div className="form grid">
          <Select label="User" value={form.userId} options={users.map((u) => [u._id, `${u.name} (${u.role})`])} onChange={(v) => setForm({ ...form, userId: v })} />
          <Field label="Date" type="date" value={form.date} onChange={(v) => { setForm({ ...form, date: v }); if (v) setCalendarMonth(v.slice(0, 7)) }} />
          <Select label="Status" value={form.status} options={['present', 'absent']} onChange={(v) => setForm({ ...form, status: v })} />
          <Select label="Vehicle" value={form.vehicleId} options={vehicles.map((v) => [v._id, v.vehicleNumber])} onChange={(v) => setForm({ ...form, vehicleId: v })} />
        </div>
        <button className="primary" onClick={save} disabled={!form.userId}><Save size={16} />Save attendance</button>
      </section>
      <AttendanceCalendar user={selectedUser} rows={attendanceRows} month={calendarMonth} setMonth={setCalendarMonth} />
    </div>
  )
}

function AttendanceCalendar({ user, rows, month, setMonth }) {
  const months = [-1, 0, 1].map((offset) => addMonths(month, offset))
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const visibleDates = months.flatMap((item) => calendarCells(item.key).filter((day) => day.date))
  const visibleKeys = new Set(visibleDates.map((day) => day.date))
  const present = rows.filter((row) => visibleKeys.has(row.date) && row.status === 'present').length
  const absent = rows.filter((row) => visibleKeys.has(row.date) && row.status === 'absent').length
  const unmarked = visibleDates.length - present - absent
  return (
    <section className="panel attendance-calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">{user ? `${user.role} attendance` : 'Attendance calendar'}</p>
          <h2>{user ? user.name : 'Select a user'}</h2>
        </div>
        <div className="calendar-slider">
          <button className="icon-btn" title="Previous month" onClick={() => setMonth(addMonths(month, -1).key)}><ChevronLeft size={18} /></button>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <button className="icon-btn" title="Next month" onClick={() => setMonth(addMonths(month, 1).key)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="attendance-summary">
        <span><strong>{present}</strong> Present</span>
        <span><strong>{absent}</strong> Absent</span>
        <span><strong>{unmarked}</strong> Unmarked</span>
      </div>
      <div className="calendar-strip">
        {months.map((item) => (
          <div className={`month-card ${item.key === month ? 'center' : ''}`} key={item.key}>
            <h3>{item.label}</h3>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid">
              {calendarCells(item.key).map((day, index) => {
                if (!day.date) return <div className="calendar-day empty" key={`empty-${index}`} />
                const attendance = byDate.get(day.date)
                const status = attendance?.status || 'unmarked'
                return (
                  <div className={`calendar-day ${status}`} key={day.date}>
                    <strong>{day.label}</strong>
                    <span>{status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'No record'}</span>
                    {attendance?.vehicleId?.vehicleNumber && <small>{attendance.vehicleId.vehicleNumber}</small>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Alerts() {
  const [rows, setRows] = useState([])
  useEffect(() => { api.get('/common/alerts').then((r) => setRows(r.data)) }, [])
  return <section className="panel"><DataTable rows={rows} columns={['severity', 'targetType', 'title', 'message', 'dueDate']} /></section>
}

function JobTable({ jobs = [], progress, addMaterial }) {
  const [entries, setEntries] = useState({})
  function entryFor(jobId) {
    return entries[jobId] || { driverId: '', quantity: '' }
  }
  function updateEntry(jobId, patch) {
    setEntries((current) => ({ ...current, [jobId]: { ...entryFor(jobId), ...patch } }))
  }
  async function submitMaterial(row) {
    const entry = entryFor(row._id)
    const saved = await addMaterial(row, entry)
    if (saved) setEntries((current) => ({ ...current, [row._id]: { driverId: '', quantity: '' } }))
  }
  const rows = jobs.map((j) => ({
    ...j,
    route: `${j.sourceSiteName || j.sourceSiteId?.name || '-'} to ${j.destinationSiteName || j.destinationSiteId?.name || '-'}`,
    progressText: `${j.completedQuantity || 0}/${j.requiredQuantity} ${j.unit || ''}`,
    lastEntry: lastProgressText(j),
    drivers: j.assignments?.map((a) => a.driverName || a.driverId?.name).filter(Boolean).join(', ')
  }))
  return (
    <section className="panel">
      <PanelTitle icon={ClipboardList} text="Jobs" />
      <DataTable rows={rows} columns={['status', 'materialName', 'route', 'progressText', 'lastEntry', 'drivers', 'startDate', 'endDate']} actions={addMaterial ? (row) => {
        const remaining = Number(row.requiredQuantity || 0) - Number(row.completedQuantity || 0)
        const entry = entryFor(row._id)
        if (row.status === 'completed') return <span className="muted">Completed</span>
        if (row.status === 'expired') return <span className="muted">Needs admin extension</span>
        if (!row.assignments?.length) return <span className="muted">No driver assigned</span>
        return (
          <div className="job-progress-action">
            <select value={entry.driverId} onChange={(event) => updateEntry(row._id, { driverId: event.target.value })}>
              <option value="">Which driver?</option>
              {row.assignments.map((assignment) => {
                const id = assignment.driverId?._id || assignment.driverId
                const name = assignment.driverName || assignment.driverId?.name || 'Driver'
                return <option key={id} value={id}>{name}</option>
              })}
            </select>
            <input type="number" min="0" max={remaining} step="0.01" placeholder={`Qty ${row.unit || ''}`} value={entry.quantity} onChange={(event) => updateEntry(row._id, { quantity: event.target.value })} />
            <button className="primary" onClick={() => submitMaterial(row)} disabled={!entry.driverId || !entry.quantity}><Plus size={15} />Add</button>
          </div>
        )
      } : progress ? (row) => (
        <input className="small-input" type="number" defaultValue={row.completedQuantity} onBlur={(e) => progress(row, e.target.value)} />
      ) : null} />
    </section>
  )
}

function DocumentEditor({ doc, setDoc, addDoc, docs = [] }) {
  return (
    <div className="document-zone">
      <h2>Documents</h2>
      <div className="inline-form">
        <select value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })}>{docTypes.map((d) => <option key={d}>{d}</option>)}</select>
        <input placeholder="Document number" value={doc.number} onChange={(e) => setDoc({ ...doc, number: e.target.value })} />
        <input type="date" value={doc.startDate} onChange={(e) => setDoc({ ...doc, startDate: e.target.value })} />
        <input type="date" value={doc.endDate} onChange={(e) => setDoc({ ...doc, endDate: e.target.value })} />
        <ImageField compact label="Upload" onChange={(v) => setDoc({ ...doc, imageUrl: v })} />
        <IconButton title="Add document" onClick={addDoc} icon={Upload} />
      </div>
      <DataTable rows={docs} columns={['type', 'number', 'startDate', 'endDate']} />
    </div>
  )
}

function DataTable({ rows = [], columns = [], actions }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c}>{title(c)}</th>)}{actions && <th>Actions</th>}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + (actions ? 1 : 0)}>No records yet</td></tr>}
          {rows.map((row) => (
            <tr key={row._id || JSON.stringify(row)}>
              {columns.map((c) => <td key={c}>{formatCell(row[c])}</td>)}
              {actions && <td className="actions">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return <label>{label}<input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} /></label>
}

function Select({ label, value, options, onChange }) {
  return (
    <label>{label}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function ImageField({ label, onChange, compact }) {
  async function file(e) {
    const selected = e.target.files?.[0]
    if (!selected) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(selected)
  }
  return <label className={compact ? 'file compact' : 'file'}>{label}<input type="file" accept="image/*" onChange={file} /></label>
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value ?? 0}</strong></div>
}

function PanelTitle({ icon: Icon, text }) {
  return <div className="panel-title"><Icon size={20} /><h2>{text}</h2></div>
}

function IconButton({ title, onClick, icon: Icon }) {
  return <button className="icon-btn" title={title} onClick={onClick}><Icon size={16} /></button>
}

function Profile({ entity }) {
  const attendanceRows = (entity.attendanceHistory || []).map((item) => ({
    ...item,
    vehicle: item.vehicleId?.vehicleNumber || '-',
    markedAt: formatDateTime(item.checkInTime || item.updatedAt || item.createdAt)
  }))
  return (
    <div className="profile">
      <h2>{entity.name}</h2>
      <p>{entity.address || entity.email || entity.phone}</p>
      <h3>Attendance</h3>
      <DataTable rows={attendanceRows} columns={['date', 'status', 'vehicle', 'markedAt']} />
      <h3>Documents</h3>
      <DataTable rows={entity.documents || []} columns={['type', 'number', 'endDate']} />
    </div>
  )
}

function title(value) {
  return String(value || '').replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null))
}

function splitUnits(value) {
  return String(value || '').split(',').map((v) => v.trim()).filter(Boolean)
}

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function currentMonthKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(month, offset) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + offset, 1)
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
}

function calendarCells(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const totalDays = new Date(year, monthNumber, 0).getDate()
  const cells = Array.from({ length: first.getDay() }, () => ({ date: '', label: '' }))
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ date: `${month}-${String(day).padStart(2, '0')}`, label: day })
  }
  return cells
}

function materialValue(value) {
  if (!value) return ''
  if (typeof value === 'object') return value._id || value.id || ''
  return value
}

function lastProgressText(job) {
  const last = job.progressLogs?.[job.progressLogs.length - 1]
  if (!last) return '-'
  const driver = last.driverName || last.driverId?.name || 'Driver'
  return `${last.quantity} ${last.unit || job.unit || ''} by ${driver}`
}

function presenceCell(attendance) {
  const present = attendance?.status === 'present'
  return {
    __cell: 'presence',
    present,
    label: present ? 'Present' : 'Absent',
    title: present
      ? `Marked at ${formatDateTime(attendance.checkInTime || attendance.updatedAt || attendance.createdAt)}`
      : 'Attendance not marked today'
  }
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatCell(value) {
  if (!value) return '-'
  if (value?.__cell === 'presence') {
    return <span className={`presence-badge ${value.present ? 'present' : 'absent'}`} title={value.title}>{value.label}</span>
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString()
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return value.name || value.vehicleNumber || value._id || '-'
  return String(value)
}

function updateArray(array, setter, index, key, value) {
  const next = [...array]
  next[index] = { ...next[index], [key]: value }
  setter(next)
}

export default App
