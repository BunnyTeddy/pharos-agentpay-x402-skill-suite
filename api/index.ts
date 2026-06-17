import express from "express";
import { loadConfig, loadEnv } from "../src/config.js";
import { buildDemoApiApp } from "../src/demo-api.js";
import { buildSkillServerApp } from "../src/skill-server.js";

loadEnv();

const config = loadConfig({ mode: "mock" });
const app = express();

app.set("trust proxy", true);

const { app: demoApiApp } = buildDemoApiApp(config, "mock");

app.use("/demo-api", demoApiApp);
app.use(
  buildSkillServerApp(config, {
    getDemoApiBaseUrl: (req) => `${req.protocol}://${req.get("host")}/demo-api`,
  }),
);

export default app;
