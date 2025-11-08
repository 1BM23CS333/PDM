const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const { spawn } = require("child_process");
const auth = require("../middleware/auth");
const Machine = require("../models/Machine");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "..", "data");
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const DATASET = path.join(DATA_DIR, "dataset.csv");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATASET)) {
  fs.writeFileSync(
    DATASET,
    "date,temperature,vibration,pressure,humidity,load,failed,days_to_failure\n"
  );
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// --- Helpers ---
function toCSVRow(obj) {
  const vals = [
    obj.date ?? "",
    obj.temperature ?? "",
    obj.vibration ?? "",
    obj.pressure ?? "",
    obj.humidity ?? "",
    obj.load ?? "",
    obj.failed ?? "",
    obj.days_to_failure ?? "",
  ];
  return vals.join(",") + "\n";
}

// Parse OCR text lines into rows by detecting headers and splitting on spaces/commas
function parseTableText(text) {
  // Normalize
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // Find header line (look for known keywords)
  const headerIndex = lines.findIndex(l =>
    /(date|temp|temperature).*(vib|vibration).*|(failed|days?_?to?_?failure)/i.test(l)
  );
  if (headerIndex === -1) {
    return { rows: [], message: "No header row detected in OCR text." };
  }

  const dataLines = lines.slice(headerIndex + 1);

  const rows = [];
  for (const line of dataLines) {
    // split by comma or multiple spaces
    const parts = line.split(/,|\s{2,}/).map(s => s.trim()).filter(Boolean);
    // We try to map by naive positions: [date, temp, vib, press, hum, load, failed, dtf]
    if (parts.length < 4) continue; // too short to be meaningful
    const row = {
      date: parts[0] || "",
      temperature: parseFloat(parts[1]?.replace(",", ".")),
      vibration: parseFloat(parts[2]?.replace(",", ".")),
      pressure: parseFloat(parts[3]?.replace(",", ".")),
      humidity: parts[4] ? parseFloat(parts[4].replace("%","").replace(",", ".")) : "",
      load: parts[5] ? parseFloat(parts[5].replace("%","").replace(",", ".")) : "",
      failed: parts[6] ? (/(1|yes|true|y)/i.test(parts[6]) ? 1 : 0) : "",
      days_to_failure: parts[7] ? parseFloat(parts[7].replace(",", ".")) : "",
    };
    rows.push(row);
  }
  return { rows };
}

// ========== 1) Ingest table image via OCR ==========
router.post("/ingest-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    const ocr = await Tesseract.recognize(req.file.path, "eng");
    const text = ocr?.data?.text || "";
    const { rows, message } = parseTableText(text);

    if (!rows.length) {
      return res.status(200).json({
        ok: false,
        message: message || "Could not parse table rows from OCR.",
        rawText: text,
      });
    }

    // Append to dataset.csv
    const appends = rows.map(toCSVRow).join("");
    fs.appendFileSync(DATASET, appends);

    res.json({
      ok: true,
      added: rows.length,
      preview: rows.slice(0, 5),
      datasetPath: "data/dataset.csv",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "OCR ingest failed", error: e.message });
  }
});

// ========== 2) Ingest CSV directly ==========
router.post("/ingest-csv", auth, upload.single("csv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No CSV uploaded" });
    // Simple append (assume headers present or not; we’ll accept raw rows and skip empty)
    const content = fs.readFileSync(req.file.path, "utf8");
    const lines = content.split(/\r?\n/).filter(l => l.trim().length);
    // If line looks like a header (contains 'temperature' etc), skip the first line once
    const skipHeader = /temperature|vibration|pressure|failed|days?_?to?_?failure/i.test(lines[0]);
    const toAppend = (skipHeader ? lines.slice(1) : lines).join("\n") + "\n";
    fs.appendFileSync(DATASET, toAppend);
    res.json({ ok: true, addedLines: (skipHeader ? lines.length - 1 : lines.length) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "CSV ingest failed", error: e.message });
  }
});

// ========== 3) Train model (calls Python) ==========
router.post("/train", auth, async (_req, res) => {
  try {
    const py = spawn(process.platform === "win32" ? "python" : "python3", [
      path.join(__dirname, "..", "ml", "train_model.py"),
      DATASET
    ], { cwd: path.join(__dirname, "..", "ml") });

    let out = "", err = "";
    py.stdout.on("data", d => out += d.toString());
    py.stderr.on("data", d => err += d.toString());
    py.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: "Training failed", error: err || out });
      }
      // Read metrics.json
      const metricsPath = path.join(__dirname, "..", "ml", "metrics.json");
      let metrics = {};
      if (fs.existsSync(metricsPath)) {
        metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
      }
      res.json({ ok: true, metrics });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Train call failed", error: e.message });
  }
});

// ========== 4) Predict for one machine ==========
// Uses current machine parameters to form a feature vector.
// If the trained model includes a regression for days_to_failure, we’ll use it;
// otherwise we compute a heuristic RUL from classifier probability.
router.post("/predict/:machineId", auth, async (req, res) => {
  try {
    const m = await Machine.findById(req.params.machineId).lean();
    if (!m) return res.status(404).json({ message: "Machine not found" });

    // Build feature vector from machine current parameters
    const features = {
      temperature: m.parameters?.find(p => /temp/i.test(p.parameter))?.current ?? "",
      vibration:   m.parameters?.find(p => /vib/i.test(p.parameter))?.current ?? "",
      pressure:    m.parameters?.find(p => /press/i.test(p.parameter))?.current ?? "",
      humidity:    m.parameters?.find(p => /humid/i.test(p.parameter))?.current ?? "",
      load:        m.parameters?.find(p => /load|util/i.test(p.parameter))?.current ?? ""
    };

    const py = spawn(process.platform === "win32" ? "python" : "python3", [
      path.join(__dirname, "..", "ml", "train_model.py"),
      "--predict",
      JSON.stringify(features)
    ], { cwd: path.join(__dirname, "..", "ml") });

    let out = "", err = "";
    py.stdout.on("data", d => out += d.toString());
    py.stderr.on("data", d => err += d.toString());
    py.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: "Prediction failed", error: err || out });
      }
      const result = JSON.parse(out);
      res.json({ ok: true, machine: m.name, prediction: result });
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Predict call failed", error: e.message });
  }
});

module.exports = router;
