const express = require("express");
const multer = require("multer");
const path = require("path");
const XLSX = require("xlsx");
const { exec } = require("child_process");
const auth = require("../middleware/auth");

const router = express.Router();

// Save file in backend/uploads/
const storage = multer.diskStorage({
  destination: "backend/uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Upload file + train model
router.post("/excel", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = path.resolve(req.file.path);

    exec(`python backend/model/train_model.py "${filePath}"`, (err, stdout) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Training failed" });
      }
      console.log(stdout);
      return res.json({ message: "✅ File uploaded & Model trained successfully!" });
    });

  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
