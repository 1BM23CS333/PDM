const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const auth = require("../middleware/auth");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /train/upload
router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const csvPath = req.file.path;

  // Run Python training script
  exec(`python backend/python/train_model.py ${csvPath}`, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ message: "Training error", error: stderr });

    return res.json({ message: "✅ Model Trained Successfully!" });
  });
});

module.exports = router;
