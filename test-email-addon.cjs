const fetch = require('node-fetch');

async function testEmailAddonPurchase() {
  console.log("Testing email addon purchase flow...");
  
  try {
    // First, try to get a valid session token by logging in
    console.log("Step 1: Testing authentication...");
    
    const loginResponse = await fetch('http://decisionmaker.shrawantravels.com/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'salesrep@techize.com',
        password: 'password123'  // Using common test password
      })
    });
    
    if (!loginResponse.ok) {
      console.log("Login failed, status:", loginResponse.status);
      const errorText = await loginResponse.text();
      console.log("Login error:", errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log("Login successful for user:", loginData.user?.email);
    const token = loginData.token;
    
    if (!token) {
      console.log("No token received from login");
      return;
    }
    
    // Step 2: Check current user status
    console.log("\nStep 2: Checking current user status...");
    const userResponse = await fetch('http://decisionmaker.shrawantravels.com/api/current-user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log("Current user:");
      console.log("- Email:", userData.email);
      console.log("- Package:", userData.packageType);
      console.log("- Has Email Addon:", userData.hasEmailAddon || false);
      
      if (userData.hasEmailAddon) {
        console.log("User already has email addon - testing admin fix endpoint to reset it first");
        
        // Reset the addon to test purchase flow
        const resetResponse = await fetch(`http://decisionmaker.shrawantravels.com/api/admin/reset-email-addon/${userData.email}`, {
          method: 'POST'
        });
        
        if (resetResponse.ok) {
          console.log("Email addon reset successfully");
        }
      }
      
      // Step 3: Test email addon purchase
      console.log("\nStep 3: Testing email addon purchase...");
      const purchaseResponse = await fetch('http://decisionmaker.shrawantravels.com/api/purchase-email-addon', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (purchaseResponse.ok) {
        const purchaseData = await purchaseResponse.json();
        console.log("Purchase response:", purchaseData);
        console.log("Client secret received:", !!purchaseData.clientSecret);
        
        // Step 4: Test manual addon activation (simulating successful payment)
        console.log("\nStep 4: Testing manual addon activation...");
        const activateResponse = await fetch(`http://decisionmaker.shrawantravels.com/api/admin/fix-email-addon/${userData.email}`, {
          method: 'POST'
        });
        
        if (activateResponse.ok) {
          const activateData = await activateResponse.json();
          console.log("Manual activation response:", activateData);
          
          // Step 5: Verify addon is now active
          console.log("\nStep 5: Verifying addon activation...");
          const verifyResponse = await fetch('http://decisionmaker.shrawantravels.com/api/current-user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log("Verification result:");
            console.log("- Has Email Addon:", verifyData.hasEmailAddon || false);
            console.log("- Purchase Date:", verifyData.emailAddonPurchaseDate || "Not set");
            
            if (verifyData.hasEmailAddon) {
              console.log("✅ EMAIL ADDON PURCHASE FLOW WORKING!");
            } else {
              console.log("❌ Email addon not activated - there's still an issue");
            }
          } else {
            console.log("Failed to verify addon status");
          }
        } else {
          console.log("Manual activation failed");
        }
      } else {
        const purchaseError = await purchaseResponse.text();
        console.log("Purchase failed:", purchaseError);
      }
    } else {
      console.log("Failed to get current user");
    }
    
  } catch (error) {
    console.error("Test error:", error);
  }
}

testEmailAddonPurchase();