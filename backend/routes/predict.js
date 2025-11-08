const express = require("express");
const { execFile } = require("child_process");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth, (req, res) => {
  const inputData = req.body;  // Expecting sensor values JSON

  execFile("python3", ["models/predict.py", JSON.stringify(inputData)], (err, stdout, stderr) => {
    if (err) {
      console.log("Prediction Error:", stderr);
      return res.status(500).json({ message: "Prediction failed", error: stderr });
    }

    try {
      const prediction = JSON.parse(stdout);
      res.json(prediction);
    } catch (parseErr) {
      res.status(500).json({ message: "Prediction output invalid", stdout });
    }
  });
});

module.exports = router;
