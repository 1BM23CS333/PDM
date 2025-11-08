const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ADJUST — Replace with your actual model paths
const User = require("../models/User");
const Machine = require("../models/Machine");

const MONGO_URI = "mongodb://127.0.0.1:27017/pdm"; // Make sure this DB name matches your .env

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear old data
    await User.deleteMany({});
    await Machine.deleteMany({});

    // Create demo users
    const adminPass = await bcrypt.hash("admin123", 10);
    const engPass = await bcrypt.hash("engineer123", 10);

    await User.insertMany([
      { name: "Admin User", email: "admin@example.com", password: adminPass, role: "admin" },
      { name: "Maintenance Engineer", email: "engineer@example.com", password: engPass, role: "engineer" }
    ]);

    console.log("✅ Users added");

    // Insert demo machines
    await Machine.insertMany([
      {
        name: "Hydraulic Press A1",
        type: "Hydraulic Press",
        status: "Running",
        healthScore: 82,
        failureProbability: 0.24,
        parameters: [
          { parameterName: "Temperature", value: 68, criticalLevel: 90 },
          { parameterName: "Pressure", value: 120, criticalLevel: 160 },
          { parameterName: "Vibration", value: 2.5, criticalLevel: 5 }
        ]
      },
      {
        name: "CNC Lathe B3",
        type: "CNC Machine",
        status: "Warning",
        healthScore: 64,
        failureProbability: 0.48,
        parameters: [
          { parameterName: "Temperature", value: 92, criticalLevel: 90 },
          { parameterName: "Vibration", value: 4.9, criticalLevel: 5 },
          { parameterName: "Load", value: 74, criticalLevel: 85 }
        ]
      },
      {
        name: "Cooling Pump C2",
        type: "Pump",
        status: "Critical",
        healthScore: 45,
        failureProbability: 0.71,
        parameters: [
          { parameterName: "Temperature", value: 96, criticalLevel: 80 },
          { parameterName: "Pressure", value: 160, criticalLevel: 140 },
          { parameterName: "Noise Level", value: 82, criticalLevel: 60 }
        ]
      }
    ]);

    console.log("✅ Machines added successfully");
    process.exit();

  } catch (err) {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  }
}

seed();
