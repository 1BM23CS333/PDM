const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");
const Machine = require("../models/Machine");
const auth = require("../middleware/auth");
const { spawn } = require("child_process");

const router = express.Router();

// Ensure folders exist
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const DATA_DIR = path.join(__dirname, "..", "data");
const DATASET = path.join(DATA_DIR, "dataset.csv");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATASET)) {
  fs.writeFileSync(DATASET, "temperature,vibration,pressure,humidity,load,failed,days_to_failure\n");
}

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});
const upload = multer({ storage });

// Default thresholds / weights
const DEFAULTS = {
  Temperature: { critical: 90, unit: "°C", weight: 0.30 },
  Vibration:   { critical: 7,  unit: "mm/s", weight: 0.40 },
  Pressure:    { critical: 110, unit: "psi", weight: 0.20 },
  Humidity:    { critical: 90, unit: "%", weight: 0.10 },
  Load:        { critical: 100, unit: "%", weight: 0.10 }
};

// Compute machine health
function computeHealth(machine) {
  if (!machine.parameters?.length) return { overallHealth: 100, mostCritical: null };
  let sumWeighted = 0, sumWeights = 0, mostCritical = null;
  for (const p of machine.parameters) {
    const health = Math.max(0, (1 - (p.current / p.critical)) * 100);
    const weighted = health * (p.weight || 0);
    sumWeighted += weighted; sumWeights += (p.weight || 0);

    const riskScore = (100 - health) * (p.weight || 0);
    if (!mostCritical || riskScore > mostCritical.score) {
      mostCritical = { ...p, score: riskScore, health };
    }
  }
  return { overallHealth: +(sumWeighted / (sumWeights || 1)).toFixed(2), mostCritical };
}

// Extract values from OCR text
function parseParams(text) {
  const out = {};
  const match = (label, regexes, defaultUnit) => {
    for (let r of regexes) {
      let m = text.match(r);
      if (m) return { current: parseFloat(m[1]), unit: m[2] || defaultUnit };
    }
  };
  out.Temperature = match("Temperature", [/Temp.*?([0-9.]+)\s*°?\s*C/i], "°C");
  out.Vibration   = match("Vibration",  [/Vibration.*?([0-9.]+)\s*(mm\/s|mm\/sec)/i], "mm/s");
  out.Pressure    = match("Pressure",   [/Pressure.*?([0-9.]+)\s*(psi|bar)/i], "psi");
  out.Humidity    = match("Humidity",   [/Humidity.*?([0-9.]+)\s*%/i], "%");
  out.Load        = match("Load",       [/Load.*?([0-9.]+)\s*%/i], "%");

  Object.keys(out).forEach(k => { if (!out[k] || isNaN(out[k].current)) delete out[k]; });
  return out;
}

// ✅ Auto-train ML model
function autoTrainModel() {
  const py = spawn(process.platform === "win32" ? "python" : "python3", [
    path.join(__dirname, "..", "ml", "train_model.py"),
    DATASET
  ], { cwd: path.join(__dirname, "..", "ml") });

  py.on("close", () => console.log("✅ ML model retrained automatically after OCR update"));
}

// ✅ Append row to dataset.csv
function appendToDataset(params) {
  const row = [
    params.Temperature?.current ?? "",
    params.Vibration?.current ?? "",
    params.Pressure?.current ?? "",
    params.Humidity?.current ?? "",
    params.Load?.current ?? "",
    "",   // failed (unknown at time of reading)
    ""    // days_to_failure (unknown initially)
  ].join(",") + "\n";

  fs.appendFileSync(DATASET, row);
}

router.post("/analyze", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const ocr = await Tesseract.recognize(req.file.path, "eng");
    const text = ocr?.data?.text || "";
    const parsed = parseParams(text);

    if (!Object.keys(parsed).length) {
      return res.json({ ok: false, message: "Could not extract known parameters", rawText: text });
    }

    const name = req.body.name?.trim() || `Machine-${Date.now()}`;
    let machine = await Machine.findOne({ name });

    const newParams = Object.keys(parsed).map(key => ({
      parameter: key,
      unit: parsed[key].unit || DEFAULTS[key]?.unit,
      current: parsed[key].current,
      critical: DEFAULTS[key]?.critical,
      weight: DEFAULTS[key]?.weight
    }));

    if (!machine) {
      machine = await Machine.create({
        name,
        type: req.body.type || "Unknown",
        parameters: newParams,
        lastServiceDate: new Date()
      });
    } else {
      for (let np of newParams) {
        const idx = machine.parameters.findIndex(p => p.parameter === np.parameter);
        if (idx >= 0) machine.parameters[idx].current = np.current;
        else machine.parameters.push(np);
      }
      await machine.save();
    }

    // Compute updated health
    const { overallHealth, mostCritical } = computeHealth(machine.toObject());

    // ✅ Add reading to dataset.csv
    appendToDataset(parsed);

    // ✅ Train model automatically
    autoTrainModel();

    res.json({ ok: true, id: machine._id, name: machine.name, parsed, overallHealth, mostCritical });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "OCR failed", error: e.message });
  }
});

module.exports = router;
