const mongoose = require("mongoose");
const Info = require("../src/models/Information");

mongoose.connect("mongodb+srv://shivitripathi2511:Zero%402511@cluster1.piutcpz.mongodb.net/?appName=Cluster1")
  .then(async () => {
    console.log("MongoDB Atlas Connected.");
    try {
      await Info.collection.dropIndex("phone_1");
      console.log("Successfully dropped the problematic 'phone_1' index!");
    } catch (err) {
      console.log("Index might already be dropped or not found:", err.message);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.log("Connection Error", err);
    process.exit(1);
  });
