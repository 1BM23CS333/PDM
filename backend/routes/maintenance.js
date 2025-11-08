const express = require("express");
const Maintenance = require("../models/Maintenance");
const Machine = require("../models/Machine");
const auth = require("../middleware/auth");
const router = express.Router();

// Get all events
router.get("/all", auth, async (req, res) => {
  const events = await Maintenance.find().populate("machine").lean();
  res.json(events.map(e => ({
    id: e._id,
    title: `${e.machine.name}`,
    date: e.date,
    description: e.description
  })));
});

// Add event
router.post("/add", auth, async (req, res) => {
  const { machineId, date, description } = req.body;
  const event = await Maintenance.create({ machine: machineId, date, description });
  res.json({ ok: true, event });
});

// Delete event
router.delete("/delete/:id", auth, async (req, res) => {
  await Maintenance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
