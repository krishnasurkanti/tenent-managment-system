const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hostel_management";

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
}

module.exports = connectDatabase;
