const express = require("express");
const Machine = require("../models/Machine");
const Task = require("../models/MaintenanceTask");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/auto", auth, async (_req, res) => {
  const machines = await Machine.find().lean();
  let created = [];

  for (const m of machines) {
    if (!m.remainingLife) continue;
    if (m.remainingLife > 10) continue;

    const existing = await Task.findOne({ machineId: m._id, status: "Pending" });
    if (existing) continue;

    const due = new Date();
    due.setDate(due.getDate() + m.remainingLife);

    const task = await Task.create({
      machineId: m._id,
      machineName: m.name,
      dueDate: due,
      reason: "Remaining Life Below Threshold"
    });

    created.push(task);
  }

  res.json({ ok: true, created });
});

router.get("/all", auth, async (_req, res) => {
  const tasks = await Task.find().sort({ dueDate: 1 }).lean();
  res.json(tasks);
});

router.post("/complete/:id", auth, async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, { status: "Completed" });
  res.json({ ok: true });
});

module.exports = router;
