const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://yash6491:YASHVANT@cluster0.f3pmu6p.mongodb.net/biobridge?retryWrites=true&w=majority";

async function createSampleDMs() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const db = client.db("biobridge");
    const users = db.collection("users");
    
    // Sample Decision Makers
    const sampleDMs = [
      {
        email: "sarah.johnson@techcorp.com",
        password: "$2b$10$K7L/8Y3TAFyev.qwuCO1he.k.hKKieFXEr4VLZz1DqXeMKUtyK/VW", // DecisionMaker123!
        role: "decision_maker",
        firstName: "Sarah",
        lastName: "Johnson",
        jobTitle: "Chief Technology Officer",
        company: "TechCorp Solutions",
        industry: "Technology",
        companySize: "201-500 employees",
        yearsInRole: "3-5 years",
        packageType: "enterprise",
        isActive: true,
        standing: "excellent",
        linkedinVerified: true,
        linkedinUrl: "https://www.linkedin.com/in/sarah-johnson-cto",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        availability: {
          timezone: "America/New_York",
          workingHours: {
            start: "09:00",
            end: "17:00"
          },
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "michael.chen@innovateplus.com",
        password: "$2b$10$K7L/8Y3TAFyev.qwuCO1he.k.hKKieFXEr4VLZz1DqXeMKUtyK/VW",
        role: "decision_maker",
        firstName: "Michael",
        lastName: "Chen",
        jobTitle: "VP of Product",
        company: "InnovatePlus Inc",
        industry: "Software",
        companySize: "51-200 employees",
        yearsInRole: "6-10 years",
        packageType: "professional",
        isActive: true,
        standing: "good",
        linkedinVerified: true,
        linkedinUrl: "https://www.linkedin.com/in/michael-chen-vp",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        availability: {
          timezone: "America/Los_Angeles",
          workingHours: {
            start: "08:30",
            end: "16:30"
          },
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "emily.davis@greentech.com",
        password: "$2b$10$K7L/8Y3TAFyev.qwuCO1he.k.hKKieFXEr4VLZz1DqXeMKUtyK/VW",
        role: "decision_maker",
        firstName: "Emily",
        lastName: "Davis",
        jobTitle: "Head of Operations",
        company: "GreenTech Innovations",
        industry: "Clean Energy",
        companySize: "101-200 employees",
        yearsInRole: "2-3 years",
        packageType: "professional",
        isActive: true,
        standing: "excellent",
        linkedinVerified: true,
        linkedinUrl: "https://www.linkedin.com/in/emily-davis-ops",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        availability: {
          timezone: "America/Chicago",
          workingHours: {
            start: "09:00",
            end: "17:30"
          },
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "david.rodriguez@financeplus.com",
        password: "$2b$10$K7L/8Y3TAFyev.qwuCO1he.k.hKKieFXEr4VLZz1DqXeMKUtyK/VW",
        role: "decision_maker",
        firstName: "David",
        lastName: "Rodriguez",
        jobTitle: "Director of Finance",
        company: "FinancePlus Corp",
        industry: "Financial Services",
        companySize: "501-1000 employees",
        yearsInRole: "6-10 years",
        packageType: "enterprise",
        isActive: true,
        standing: "good",
        linkedinVerified: true,
        linkedinUrl: "https://www.linkedin.com/in/david-rodriguez-finance",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        availability: {
          timezone: "America/New_York",
          workingHours: {
            start: "08:00",
            end: "16:00"
          },
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "lisa.thompson@healthcaresys.com",
        password: "$2b$10$K7L/8Y3TAFyev.qwuCO1he.k.hKKieFXEr4VLZz1DqXeMKUtyK/VW",
        role: "decision_maker",
        firstName: "Lisa",
        lastName: "Thompson",
        jobTitle: "Chief Medical Officer",
        company: "HealthCare Systems",
        industry: "Healthcare",
        companySize: "1001+ employees",
        yearsInRole: "10+ years",
        packageType: "enterprise",
        isActive: true,
        standing: "excellent",
        linkedinVerified: true,
        linkedinUrl: "https://www.linkedin.com/in/lisa-thompson-cmo",
        domainVerified: true,
        invitationStatus: "accepted",
        calendarIntegrationEnabled: true,
        availability: {
          timezone: "America/Denver",
          workingHours: {
            start: "07:00",
            end: "15:00"
          },
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert sample DMs
    for (const dm of sampleDMs) {
      const existingUser = await users.findOne({ email: dm.email });
      if (!existingUser) {
        const result = await users.insertOne(dm);
        console.log(`Created DM: ${dm.firstName} ${dm.lastName} (${dm.email}) - ID: ${result.insertedId}`);
      } else {
        console.log(`DM already exists: ${dm.email}`);
      }
    }
    
    console.log("\nSample Decision Makers created successfully!");
    console.log("You can now test the DM selection popup in the calendar booking system.");
    
  } catch (error) {
    console.error("Error creating sample DMs:", error);
  } finally {
    await client.close();
  }
}

createSampleDMs();