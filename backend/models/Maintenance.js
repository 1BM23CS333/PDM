const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
  date: { type: Date, required: true },
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
