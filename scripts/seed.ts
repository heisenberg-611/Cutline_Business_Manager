import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.projectAsset.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.note.deleteMany();
  await prisma.projectStageHistory.deleteMany();
  await prisma.workflowStage.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.invoiceReminder.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const MAIN_USER_ID = "user_3GF3t8giG7nRu2vBdb0ZDPrtjcR";
  const SECONDARY_USER_ID = "user_3GEFk6bbd4scawGalr3XOGUQhT2";
  const ORG_ID = "org_3GEIEBGsrW3ePwjLXp84ycUR5KA";

  // Create Users
  console.log("👤 Creating users...");
  const user1 = await prisma.user.create({
    data: {
      id: MAIN_USER_ID,
      email: "tanjiromonjiro7@gmail.com",
      firstName: "Tanjiro",
      lastName: "Monjiro",
      imageUrl: "https://images.clerk.dev/oauth_google/img_3GF3tAxmOYtW7GqnxG2CpwfYdfI",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: SECONDARY_USER_ID,
      email: "secondary@cutline.studio",
      firstName: "Active",
      lastName: "User",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ActiveUser&scale=80",
    },
  });

  // Create Business
  console.log("🏢 Creating business...");
  const business = await prisma.business.create({
    data: {
      id: ORG_ID,
      name: "Cutline Studios Demo",
      defaultCurrency: "USD",
    },
  });

  // Create Business Memberships
  console.log("👥 Creating business memberships...");
  await prisma.businessMembership.createMany({
    data: [
      {
        id: "mem_001",
        businessId: business.id,
        userId: user1.id,
        role: "org:admin",
      },
      {
        id: "mem_002",
        businessId: business.id,
        userId: user2.id,
        role: "org:member",
      },
    ],
  });

  // Create 15 Clients
  console.log("👨‍💼 Creating 15 clients...");
  const clientNames = [
    "Sarah Johnson", "Michael Torres", "Emma Chen", "David Smith", "Olivia Davis",
    "James Wilson", "Sophia Taylor", "Robert Anderson", "Isabella Thomas", "William Jackson",
    "Mia White", "Joseph Harris", "Charlotte Martin", "Charles Thompson", "Amelia Garcia"
  ];

  const companyNames = [
    "TechVision Marketing", "Torres Photography", "Elevate Design Studio", "Smith Tech", "Davis Group",
    "Wilson & Co", "Taylor Media", "Anderson Logistics", "Thomas Retail", "Jackson Tech",
    "White Creative", "Harris Industries", "Martin Solutions", "Thompson Partners", "Garcia Inc"
  ];

  const industries = ["Technology", "Photography", "Design", "Software", "Finance", "Media", "Logistics", "Retail", "Manufacturing", "Consulting", "Real Estate", "Healthcare", "Education", "Entertainment", "Hospitality"];

  const clientsData = Array.from({ length: 15 }).map((_, i) => ({
    id: `client_${String(i + 1).padStart(3, '0')}`,
    businessId: business.id,
    displayName: clientNames[i],
    companyName: companyNames[i],
    email: `${clientNames[i].split(" ")[0].toLowerCase()}@${companyNames[i].split(" ")[0].toLowerCase()}.com`,
    industry: industries[i],
    preferredChannel: i % 2 === 0 ? "email" : "phone",
    preferredDeliveryMethod: i % 2 === 0 ? "cloud" : "physical",
    internalRating: Math.floor(Math.random() * 3) + 3, // 3 to 5
    createdAt: new Date(Date.now() - Math.random() * 10000000000),
  }));

  await prisma.client.createMany({ data: clientsData });
  const dbClients = await prisma.client.findMany({ where: { businessId: business.id } });

  // Create Workflow Templates
  console.log("📋 Creating workflow templates...");
  const standardTemplate = await prisma.workflowTemplate.create({
    data: {
      id: "tmpl_standard",
      businessId: business.id,
      name: "Standard Video Production",
      stages: {
        create: [
          {
            name: "Pre-production",
            orderIndex: 0,
            billingTrigger: false
          },
          {
            name: "Production",
            orderIndex: 1,
            billingTrigger: false
          },
          {
            name: "Post-production",
            orderIndex: 2,
            billingTrigger: false
          },
          {
            name: "Delivered",
            orderIndex: 3,
            billingTrigger: true
          }
        ]
      }
    }
  });

  const stages = await prisma.workflowStage.findMany({ where: { templateId: standardTemplate.id }, orderBy: { orderIndex: 'asc' } });

  // Create 10 Projects
  console.log("🎥 Creating 10 projects...");
  const projectTypes = ["Commercial", "Wedding", "Documentary", "Music Video", "Corporate", "Event", "Real Estate", "Short Film", "Social Media", "Product Shoot"];
  const projectNames = ["Summer Campaign", "Smith Wedding", "Nature Doc", "Artist Music Video", "Q3 All-hands", "Tech Conference", "Downtown Loft", "Indie Short", "TikTok Series", "New Product Launch"];

  for (let i = 0; i < 10; i++) {
    const client = dbClients[i % dbClients.length];
    const stage = stages[i % stages.length];
    const expectedValue = Math.floor(Math.random() * 900000) + 100000; // 1k to 10k in cents

    const project = await prisma.project.create({
      data: {
        id: `proj_${String(i + 1).padStart(3, '0')}`,
        businessId: business.id,
        clientId: client.id,
        title: projectNames[i],
        type: projectTypes[i],
        statusStageId: stage.id,
        priority: i % 3 === 0 ? "HIGH" : i % 3 === 1 ? "MEDIUM" : "LOW",
        deadline: new Date(Date.now() + Math.random() * 5000000000),
        orderIndex: i,
        timeEntries: {
          create: [
            {
              userId: user1.id,
              durationMinutes: 120,
              startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120 * 60000),
              isBillable: true,
            }
          ]
        },
        notes: {
          create: [
            {
              type: "client",
              content: "Client requested additional revisions on the first draft.",
            }
          ]
        }
      }
    });

    // Create Invoice for some projects
    if (i % 2 === 0) {
      console.log(`💰 Creating invoice and payment for project ${i + 1}...`);
      const amountCents = expectedValue;
      const status = i % 4 === 0 ? "PAID" : "DRAFT";

      const invoice = await prisma.invoice.create({
        data: {
          id: `inv_${String(i + 1).padStart(3, '0')}`,
          businessId: business.id,
          clientId: client.id,
          projectId: project.id,
          invoiceNumber: `INV-2024-${String(i + 1).padStart(3, '0')}`,
          status: status,
          currency: "USD",
          issuedAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paidAt: status === "PAID" ? new Date() : null,
          subtotalCents: amountCents,
          taxRateBps: 1000,
          taxAmountCents: Math.floor(amountCents * 0.1),
          totalCents: Math.floor(amountCents * 1.1),
          amountPaidCents: status === "PAID" ? Math.floor(amountCents * 1.1) : 0,
          amountDueCents: status === "PAID" ? 0 : Math.floor(amountCents * 1.1),
          lineItems: {
            create: [
              {
                description: "Standard Production Package",
                quantity: 1,
                amountCents: amountCents,
              }
            ]
          }
        }
      });

      if (status === "PAID") {
        await prisma.payment.create({
          data: {
            id: `pay_${String(i + 1).padStart(3, '0')}`,
            businessId: business.id,
            invoiceId: invoice.id,
            amountCents: invoice.totalCents,
            method: "BANK_TRANSFER",
            reference: `REF-${Math.floor(Math.random() * 10000)}`,
          }
        });
      }
    }

    // Create Expense for some projects
    if (i % 3 === 0) {
      console.log(`💸 Creating expense for project ${i + 1}...`);
      await prisma.expense.create({
        data: {
          id: `exp_${String(i + 1).padStart(3, '0')}`,
          businessId: business.id,
          projectId: project.id,
          category: "EQUIPMENT",
          description: "Lens rental from Camera House",
          amountCents: 50000,
          currency: "USD",
          dateIncurred: new Date(),
        }
      });
    }
  }

  // Create Assets
  console.log("📦 Creating assets...");
  const assetData = [
    { name: "Cinematic Music Pack", type: "Music", vendor: "AudioJungle", cost: 5000, licenseType: "Commercial" },
    { name: "Proxima Nova Font", type: "Font", vendor: "Adobe", cost: 12000, licenseType: "Desktop" },
    { name: "Teal & Orange LUTs", type: "LUT", vendor: "ColorGradingCentral", cost: 3500, licenseType: "Perpetual" },
    { name: "Saber Plugin", type: "Plugin", vendor: "VideoCopilot", cost: 0, licenseType: "Free" },
    { name: "Glitch Transitions", type: "Motion Graphics", vendor: "Envato", cost: 2500, licenseType: "Commercial" },
  ];

  await prisma.asset.createMany({
    data: assetData.map((a, i) => ({
      id: `asset_${String(i + 1).padStart(3, '0')}`,
      businessId: business.id,
      ...a,
    }))
  });

  // Create some notifications for the user
  console.log("🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        businessId: business.id,
        userId: user1.id,
        title: "Welcome to Cutline OS",
        message: "We're glad to have you here. Check out the dashboard to get started.",
        type: "system",
      },
      {
        businessId: business.id,
        userId: user1.id,
        title: "Invoice Paid",
        message: "Invoice INV-2024-001 has been fully paid by Sarah Johnson.",
        type: "invoice",
      },
      {
        businessId: business.id,
        userId: user1.id,
        title: "Project Milestone Reached",
        message: "Summer Campaign has entered Post-production.",
        type: "project",
      },
    ]
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
