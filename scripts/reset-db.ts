import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Starting database reset...");
  console.log(
    "⚠️  This will delete ALL data from the database. Proceeding in 3 seconds...\n"
  );

  // Optional: Uncomment to add a confirmation prompt
  // const confirm = await new Promise((resolve) => {
  //   setTimeout(() => resolve(true), 3000);
  // });

  try {
    // Delete in reverse order of creation (respecting foreign key constraints)
    console.log("Deleting project assets...");
    const paCount = await prisma.projectAsset.deleteMany();
    console.log(`  ✓ Deleted ${paCount.count} project assets`);

    console.log("Deleting assets...");
    const assetCount = await prisma.asset.deleteMany();
    console.log(`  ✓ Deleted ${assetCount.count} assets`);

    console.log("Deleting time entries...");
    const teCount = await prisma.timeEntry.deleteMany();
    console.log(`  ✓ Deleted ${teCount.count} time entries`);

    console.log("Deleting notes...");
    const noteCount = await prisma.note.deleteMany();
    console.log(`  ✓ Deleted ${noteCount.count} notes`);

    console.log("Deleting project stage history...");
    const pshCount = await prisma.projectStageHistory.deleteMany();
    console.log(`  ✓ Deleted ${pshCount.count} stage history records`);

    console.log("Deleting workflow stages...");
    const wsCount = await prisma.workflowStage.deleteMany();
    console.log(`  ✓ Deleted ${wsCount.count} workflow stages`);

    console.log("Deleting workflow templates...");
    const wtCount = await prisma.workflowTemplate.deleteMany();
    console.log(`  ✓ Deleted ${wtCount.count} workflow templates`);

    console.log("Deleting payments...");
    const paymentCount = await prisma.payment.deleteMany();
    console.log(`  ✓ Deleted ${paymentCount.count} payments`);

    console.log("Deleting credit notes...");
    const cnCount = await prisma.creditNote.deleteMany();
    console.log(`  ✓ Deleted ${cnCount.count} credit notes`);

    console.log("Deleting invoice reminders...");
    const irCount = await prisma.invoiceReminder.deleteMany();
    console.log(`  ✓ Deleted ${irCount.count} invoice reminders`);

    console.log("Deleting invoice line items...");
    const iliCount = await prisma.invoiceLineItem.deleteMany();
    console.log(`  ✓ Deleted ${iliCount.count} invoice line items`);

    console.log("Deleting invoices...");
    const invCount = await prisma.invoice.deleteMany();
    console.log(`  ✓ Deleted ${invCount.count} invoices`);

    console.log("Deleting expenses...");
    const expCount = await prisma.expense.deleteMany();
    console.log(`  ✓ Deleted ${expCount.count} expenses`);

    console.log("Deleting projects...");
    const projCount = await prisma.project.deleteMany();
    console.log(`  ✓ Deleted ${projCount.count} projects`);

    console.log("Deleting clients...");
    const clientCount = await prisma.client.deleteMany();
    console.log(`  ✓ Deleted ${clientCount.count} clients`);

    console.log("Deleting audit logs...");
    const auditCount = await prisma.auditLog.deleteMany();
    console.log(`  ✓ Deleted ${auditCount.count} audit logs`);

    console.log("Deleting business memberships...");
    const bmCount = await prisma.businessMembership.deleteMany();
    console.log(`  ✓ Deleted ${bmCount.count} business memberships`);

    console.log("Deleting businesses...");
    const bizCount = await prisma.business.deleteMany();
    console.log(`  ✓ Deleted ${bizCount.count} businesses`);

    console.log("Deleting users...");
    const userCount = await prisma.user.deleteMany();
    console.log(`  ✓ Deleted ${userCount.count} users`);

    console.log("\n✅ Database reset completed successfully!");
    console.log("💡 Run 'npm run seed' to populate with demo data again.\n");
  } catch (error) {
    console.error("❌ Error during reset:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
