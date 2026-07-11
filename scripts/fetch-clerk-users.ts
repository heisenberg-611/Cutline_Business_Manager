import 'dotenv/config'

async function getClerkUsers() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  if (!secretKey) {
    console.error("❌ Error: Missing CLERK_SECRET_KEY in your .env file!");
    return;
  }

  console.log("Fetching users directly from Clerk's servers...\n");

  try {
    const res = await fetch('https://api.clerk.com/v1/users', {
      headers: { 
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Clerk API responded with status: ${res.status}`);
    }

    const users = await res.json();
    console.log(`✅ Found ${users.length} users in Clerk!\n`);
    
    users.forEach((user: any, index: number) => {
      const email = user.email_addresses[0]?.email_address || 'No email';
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}\n`);
    });
    
  } catch (error) {
    console.error("Failed to fetch Clerk users:", error);
  }
}

getClerkUsers();
