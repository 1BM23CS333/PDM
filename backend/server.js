console.log("✅ Backend server starting...");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { mongoURI, port } = require("./config");
const trainRoutes = require("./routes/train");


const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.get("/", (_req, res) => res.send("✅ Predictive Maintenance API is running"));

app.use("/auth", require("./routes/auth"));
app.use("/machines", require("./routes/machines"));
app.use("/ocr", require("./routes/ocr"));          // existing OCR route
app.use("/maintenance", require("./routes/maintenance")); // if you added scheduler
app.use("/ml", require("./routes/ml"));            // ✅ NEW: ML pipeline

app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
app.use("/scheduler", require("./routes/scheduler"));
app.use("/upload", require("./routes/upload"));
app.use("/predict", require("./routes/predict"));
app.use("/train", trainRoutes);



