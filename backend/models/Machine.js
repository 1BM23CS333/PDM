const mongoose = require("mongoose");

const parameterSchema = new mongoose.Schema({
  parameter: String,        // e.g. Temperature
  unit: String,             // e.g. °C
  current: Number,          // current value
  critical: Number,         // per-machine critical threshold
  weight: Number            // importance weight (0..1)
}, { _id: false });

const probabilityPointSchema = new mongoose.Schema({
  month: String,            // e.g. "Jan", "Feb", ...
  probability: Number       // 0..100
}, { _id: false });

const machineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: String,
  lastServiceDate: Date,
  parameters: [parameterSchema],
  monthlyProbabilities: [probabilityPointSchema], // for dashboard bar chart
  failureProbability: Number,   // current overall %
  costSaved: Number,            // % saved (aggregated)
}, { timestamps: true });

module.exports = mongoose.model("Machine", machineSchema);
