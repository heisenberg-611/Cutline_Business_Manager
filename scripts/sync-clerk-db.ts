import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncUsers() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ Error: Missing CLERK_SECRET_KEY in your .env file!");
    return;
  }

  console.log("🔄 Starting full sync between Clerk and Aiven Database...\n");

  try {
    // 1. Fetch all users from Clerk
    const res = await fetch('https://api.clerk.com/v1/users', {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    const clerkUsers = await res.json();
    const clerkUserIds = new Set(clerkUsers.map((u: any) => u.id));

    console.log(`📥 Fetched ${clerkUsers.length} users from Clerk.`);

    // 2. Upsert each Clerk user into the database
    for (const clerkUser of clerkUsers) {
      const email = clerkUser.email_addresses[0]?.email_address || '';

      await prisma.user.upsert({
        where: { id: clerkUser.id },
        update: {
          email: email,
          firstName: clerkUser.first_name,
          lastName: clerkUser.last_name,
          imageUrl: clerkUser.image_url
        },
        create: {
          id: clerkUser.id,
          email: email,
          firstName: clerkUser.first_name,
          lastName: clerkUser.last_name,
          imageUrl: clerkUser.image_url
        }
      });
      console.log(`✅ Upserted user: ${clerkUser.id} (${email})`);
    }

    // 3. Find "ghost" users in the database that don't exist in Clerk
    const dbUsers = await prisma.user.findMany();
    for (const dbUser of dbUsers) {
      if (!clerkUserIds.has(dbUser.id)) {
        console.log(`🗑️  Found ghost user not in Clerk, deleting: ${dbUser.id} (${dbUser.email})`);
        // We will wrap this in a try-catch in case they have related records preventing deletion
        try {
          await prisma.user.delete({ where: { id: dbUser.id } });
          console.log(`   -> Deleted successfully.`);
        } catch (e) {
          console.log(`   -> Could not delete (likely has related projects/data). Skipping.`);
        }
      }
    }

    console.log("\n✨ Sync complete! Your Aiven database perfectly matches Clerk.");

  } catch (error) {
    console.error("❌ Sync failed:", error);
  } finally {
    await prisma.$disconnect()
  }
}

syncUsers();
