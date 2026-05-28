import cron from "node-cron";
import { generateAlerts } from "../utils/alerts.js";

export function startCron() {
  cron.schedule("*/15 * * * *", () => {
    generateAlerts().catch((error) => console.error("Alert cron failed", error));
  });
  generateAlerts().catch((error) => console.error("Initial alert generation failed", error));
}
