const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

async function debugDMs() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const db = client.db("biobridge");
    const users = db.collection("users");
    
    // Check all users with decision_maker role
    const allDMs = await users.find({ role: "decision_maker" }).toArray();
    console.log(`Found ${allDMs.length} decision makers:`);
    
    allDMs.forEach(dm => {
      console.log(`- ${dm.firstName} ${dm.lastName} (${dm.email})`);
      console.log(`  Role: ${dm.role}, Active: ${dm.isActive}, Invitation Status: ${dm.invitationStatus}`);
      console.log(`  Company: ${dm.company}, Title: ${dm.jobTitle}`);
      console.log('  ---');
    });
    
    // Check sales rep
    const salesRep = await users.findOne({ email: "techizebuilder@gmail.com" });
    if (salesRep) {
      console.log(`\nSales rep: ${salesRep.firstName} ${salesRep.lastName}`);
      console.log(`Role: ${salesRep.role}, Active: ${salesRep.isActive}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

debugDMs();