const { connectToMongoDB, ManualVerification } = require("./server/mongodb");

async function removeDuplicateManualVerifications() {
  try {
    await connectToMongoDB();
    console.log("Connected to MongoDB");

    // Find all manual verification entries grouped by userId
    const duplicates = await ManualVerification.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Found ${duplicates.length} users with duplicate manual verification entries`);

    for (const duplicate of duplicates) {
      const userId = duplicate._id;
      const docs = duplicate.docs;
      
      console.log(`\nProcessing user ${userId} with ${docs.length} entries:`);
      
      // Sort by creation date (keep the oldest one)
      docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Keep the first one, remove the rest
      const keepDoc = docs[0];
      const removeIds = docs.slice(1).map(doc => doc._id);
      
      console.log(`Keeping entry from ${keepDoc.createdAt}`);
      console.log(`Removing ${removeIds.length} duplicate entries`);
      
      // Remove the duplicates
      await ManualVerification.deleteMany({ _id: { $in: removeIds } });
    }

    console.log("\nDuplicate cleanup complete!");

    // Verify no duplicates remain
    const remainingDuplicates = await ManualVerification.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Verification: ${remainingDuplicates.length} duplicate groups remaining`);

  } catch (error) {
    console.error("Error removing duplicates:", error);
  } finally {
    process.exit(0);
  }
}

removeDuplicateManualVerifications();