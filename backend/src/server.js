import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./config/db.js";
import { seedAdmin } from "./utils/seedAdmin.js";
import { startCron } from "./cron/index.js";
import { generateAlerts } from "./utils/alerts.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import operatorRoutes from "./routes/operator.js";
import driverRoutes from "./routes/driver.js";
import commonRoutes from "./routes/common.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../public");
const clientIndexPath = path.join(clientDistPath, "index.html");

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.get("/api/status", (_req, res) => res.json({ name: "Earth & Soil ERP API", status: "ok" }));
app.get("/api/cron/alerts", async (req, res, next) => {
  try {
    if (process.env.CRON_SECRET && req.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized cron request" });
    }
    await generateAlerts();
    res.json({ status: "ok", message: "Alerts generated" });
  } catch (error) {
    next(error);
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/operator", operatorRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/common", commonRoutes);

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ message: "API route not found" });
    res.sendFile(clientIndexPath);
  });
} else {
  app.get("/", (_req, res) => res.json({ name: "Earth & Soil ERP API", status: "ok", frontend: "not built" }));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

const port = process.env.PORT || 5000;
const isVercel = process.env.VERCEL === "1";

await connectDb();
await seedAdmin();

if (!isVercel) {
  startCron();
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;
