const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

async function createSampleFlags() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const db = client.db("biobridge");
    const dmFlags = db.collection("dmflags");
    
    // Get some decision makers to flag
    const users = db.collection("users");
    const dms = await users.find({ role: "decision_maker" }).limit(3).toArray();
    const salesRep = await users.findOne({ email: "techizebuilder@gmail.com" });
    
    if (dms.length === 0 || !salesRep) {
      console.log("No DMs or sales rep found to create flags for");
      return;
    }
    
    // Sample flags for DMs
    const sampleFlags = [
      {
        dmId: dms[0]._id.toString(),
        flaggedBy: salesRep._id.toString(),
        flaggedByRole: "sales_rep",
        reason: "unprofessional_behavior",
        description: "DM was unresponsive during scheduled call and did not provide advance notice of cancellation.",
        status: "open",
        priority: "medium",
        flagType: "behavior",
        reportedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dmId: dms[1]._id.toString(),
        flaggedBy: salesRep._id.toString(),
        flaggedByRole: "sales_rep", 
        reason: "inappropriate_conduct",
        description: "DM made inappropriate comments during the meeting that violated professional standards.",
        status: "pending",
        priority: "high",
        flagType: "conduct",
        reportedAt: new Date(Date.now() - 86400000), // 1 day ago
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date()
      },
      {
        dmId: dms[0]._id.toString(),
        flaggedBy: salesRep._id.toString(),
        flaggedByRole: "sales_rep",
        reason: "time_wasting",
        description: "DM repeatedly scheduled meetings but failed to show up, wasting allocated call credits.",
        status: "resolved",
        priority: "low",
        flagType: "behavior",
        reportedAt: new Date(Date.now() - 172800000), // 2 days ago
        resolvedAt: new Date(Date.now() - 86400000),
        resolution: "DM provided explanation and rescheduled missed meetings",
        resolvedBy: "admin@naeberly.com",
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 86400000)
      }
    ];
    
    // Insert sample flags
    for (const flag of sampleFlags) {
      const existingFlag = await dmFlags.findOne({ 
        dmId: flag.dmId, 
        reason: flag.reason,
        flaggedBy: flag.flaggedBy 
      });
      
      if (!existingFlag) {
        const result = await dmFlags.insertOne(flag);
        console.log(`Created flag for DM ${flag.dmId}: ${flag.reason} (Status: ${flag.status}) - ID: ${result.insertedId}`);
      } else {
        console.log(`Flag already exists for DM ${flag.dmId}: ${flag.reason}`);
      }
    }
    
    console.log("\nSample flags created successfully!");
    console.log("You can now test the flags badge in the user dashboards.");
    
    // Show current flag counts
    const openFlags = await dmFlags.countDocuments({ status: { $in: ["open", "pending"] } });
    console.log(`\nTotal open/pending flags: ${openFlags}`);
    
  } catch (error) {
    console.error("Error creating sample flags:", error);
  } finally {
    await client.close();
  }
}

createSampleFlags();