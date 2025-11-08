const express = require("express");
const Machine = require("../models/Machine");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { spawn } = require("child_process");
const path = require("path");

const router = express.Router();

/** Compute overall weighted health + most critical parameter */
function computeHealth(machine) {
  if (!machine.parameters?.length) return { overallHealth: 100, mostCritical: null };

  let sumWeighted = 0, sumWeights = 0;
  let mostCritical = null;

  machine.parameters.forEach(p => {
    const health = Math.max(0, (1 - (p.current / p.critical)) * 100);
    const weighted = health * (p.weight || 0);
    sumWeighted += weighted;
    sumWeights += (p.weight || 0);

    const risk = (100 - health) * (p.weight || 0);
    if (!mostCritical || risk > mostCritical.score) {
      mostCritical = { ...p, score: risk, health };
    }
  });

  const overallHealth = sumWeights ? +(sumWeighted / sumWeights).toFixed(2) : 100;
  return { overallHealth, mostCritical };
}

/** Run ML prediction for one machine */
async function predictMachine(m) {
  const features = {
    temperature: m.parameters?.find(p => /temp/i.test(p.parameter))?.current ?? 0,
    vibration:   m.parameters?.find(p => /vib/i.test(p.parameter))?.current ?? 0,
    pressure:    m.parameters?.find(p => /press/i.test(p.parameter))?.current ?? 0,
    humidity:    m.parameters?.find(p => /humid/i.test(p.parameter))?.current ?? 0,
    load:        m.parameters?.find(p => /load|util/i.test(p.parameter))?.current ?? 0
  };

  return new Promise(resolve => {
    const py = spawn(process.platform === "win32" ? "python" : "python3", [
      path.join(__dirname, "..", "ml", "train_model.py"),
      "--predict",
      JSON.stringify(features)
    ], { cwd: path.join(__dirname, "..", "ml") });

    let out = "";
    py.stdout.on("data", d => out += d.toString());
    py.on("close", () => {
      try { resolve(JSON.parse(out)); }
      catch { resolve({ probability: null, rul_days: null }); }
    });
  });
}

/** Get all machines (Dashboard) */
router.get("/all", auth, async (req, res) => {
  const machines = await Machine.find().lean();

  const enriched = await Promise.all(machines.map(async m => {
    const { overallHealth, mostCritical } = computeHealth(m);
    const pred = await predictMachine(m);

    return {
      ...m,
      overallHealth,
      mostCritical,
      failureProbability: pred.probability ? Math.round(pred.probability * 100) : null,
      remainingLife: pred.rul_days ? Math.round(pred.rul_days) : null
    };
  }));

  res.json(enriched);
});

/** Single machine details page */
router.get("/:id", auth, async (req, res) => {
  const m = await Machine.findById(req.params.id).lean();
  if (!m) return res.status(404).json({ message: "Not found" });

  const { overallHealth, mostCritical } = computeHealth(m);
  const pred = await predictMachine(m);

  res.json({
    ...m,
    overallHealth,
    mostCritical,
    failureProbability: pred.probability ? Math.round(pred.probability * 100) : null,
    remainingLife: pred.rul_days ? Math.round(pred.rul_days) : null
  });
});

/** Alerts system */
router.get("/:id/alerts", auth, async (req, res) => {
  const m = await Machine.findById(req.params.id).lean();
  if (!m) return res.status(404).json({ message: "Not found" });

  const alerts = [];

  const pred = await predictMachine(m);
  const failureProb = pred.probability ? Math.round(pred.probability * 100) : 0;

  if (failureProb >= 70)
    alerts.push({ type: "Critical", message: `High failure probability: ${failureProb}%` });

  m.parameters?.forEach(p => {
    const usage = (p.current / p.critical) * 100;
    if (usage >= 90) alerts.push({ type: "Critical", message: `${p.parameter} at ${usage.toFixed(1)}% of limit` });
    else if (usage >= 75) alerts.push({ type: "Warning", message: `${p.parameter} at ${usage.toFixed(1)}% of limit` });
  });

  res.json(alerts);
});

/** Demo seeding (unchanged) */
router.get("/seed/demo", async (_req, res) => {
  await Machine.deleteMany({});
  await User.deleteMany({});

  const bcrypt = require("bcryptjs");
  const pass = await bcrypt.hash("admin123", 10);
  const admin = await User.create({ name: "Admin", email: "admin@example.com", password: pass, role: "admin" });

  res.json({ message: "Demo Mode Enabled", login: { email: admin.email, password: "admin123" } });
});

module.exports = router;
