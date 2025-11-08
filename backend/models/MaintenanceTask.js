const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
  machineName: String,
  dueDate: Date,
  status: { type: String, default: "Pending" }, // Pending | Completed
  reason: String, // e.g., "Critical Remaining Life"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MaintenanceTask", TaskSchema);
