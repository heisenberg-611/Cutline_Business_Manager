import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
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

  // Create Users
  console.log("👤 Creating users...");
  const user1 = await prisma.user.create({
    data: {
      id: "user_test_001",
      email: "alex@cutline.studio",
      firstName: "Alex",
      lastName: "Rivera",
      imageUrl:
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&scale=80",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: "user_test_002",
      email: "jordan@cutline.studio",
      firstName: "Jordan",
      lastName: "Chen",
      imageUrl:
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&scale=80",
    },
  });

  // Create Business
  console.log("🏢 Creating business...");
  const business = await prisma.business.create({
    data: {
      id: "org_3GEIEBGsrW3ePwjLXp84ycUR5KA",
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

  // Create Clients
  console.log("👨‍💼 Creating clients...");
  const clients = await prisma.client.createMany({
    data: [
      {
        id: "client_001",
        businessId: business.id,
        displayName: "Sarah Johnson",
        companyName: "TechVision Marketing",
        email: "sarah@techvision.com",
        industry: "Technology",
        preferredChannel: "email",
        preferredDeliveryMethod: "cloud",
        internalRating: 5,
      },
      {
        id: "client_002",
        businessId: business.id,
        displayName: "Michael Torres",
        companyName: "Eco Brands Co.",
        email: "michael@ecobrands.com",
        industry: "Sustainability",
        preferredChannel: "email",
        preferredDeliveryMethod: "download",
        internalRating: 4,
      },
      {
        id: "client_003",
        businessId: business.id,
        displayName: "Emma Liu",
        companyName: "StreamFlow Analytics",
        email: "emma@streamflow.io",
        industry: "SaaS",
        preferredChannel: "slack",
        preferredDeliveryMethod: "cloud",
        internalRating: 5,
      },
      {
        id: "client_004",
        businessId: business.id,
        displayName: "David Brown",
        companyName: "Fashion Forward Inc",
        email: "david@fashionforward.com",
        industry: "Fashion",
        preferredChannel: "email",
        preferredDeliveryMethod: "download",
        internalRating: 3,
      },
    ],
  });

  // Create Workflow Template
  console.log("🔄 Creating workflow template...");
  const workflowTemplate = await prisma.workflowTemplate.create({
    data: {
      id: "wft_001",
      businessId: business.id,
      name: "Standard Video Production",
      projectType: "Commercial",
      stages: {
        create: [
          {
            id: "stage_001",
            name: "Concept",
            orderIndex: 0,
            estimatedHours: 8,
            billingTrigger: false,
          },
          {
            id: "stage_002",
            name: "Pre-Production",
            orderIndex: 1,
            estimatedHours: 16,
            billingTrigger: false,
          },
          {
            id: "stage_003",
            name: "Filming",
            orderIndex: 2,
            estimatedHours: 24,
            billingTrigger: false,
          },
          {
            id: "stage_004",
            name: "Editing",
            orderIndex: 3,
            estimatedHours: 40,
            billingTrigger: true,
          },
          {
            id: "stage_005",
            name: "Revisions",
            orderIndex: 4,
            estimatedHours: 16,
            billingTrigger: false,
          },
          {
            id: "stage_006",
            name: "Delivery",
            orderIndex: 5,
            estimatedHours: 4,
            billingTrigger: true,
          },
        ],
      },
    },
  });

  // Create Projects
  console.log("📹 Creating projects...");
  const now = new Date();
  const project1 = await prisma.project.create({
    data: {
      id: "proj_001",
      businessId: business.id,
      clientId: "client_001",
      title: "TechVision Product Launch Video",
      type: "Commercial",
      priority: "high",
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      statusStageId: "stage_004",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      id: "proj_002",
      businessId: business.id,
      clientId: "client_002",
      title: "Eco Brands Sustainability Campaign",
      type: "Documentary",
      priority: "high",
      deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      statusStageId: "stage_002",
    },
  });

  const project3 = await prisma.project.create({
    data: {
      id: "proj_003",
      businessId: business.id,
      clientId: "client_003",
      title: "StreamFlow Analytics Demo",
      type: "Tutorial",
      priority: "medium",
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      statusStageId: "stage_006",
    },
  });

  const project4 = await prisma.project.create({
    data: {
      id: "proj_004",
      businessId: business.id,
      clientId: "client_004",
      title: "Fashion Forward Spring Collection",
      type: "Commercial",
      priority: "medium",
      deadline: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      statusStageId: "stage_001",
    },
  });

  // Create Project Stage History
  console.log("📊 Creating stage history...");
  await prisma.projectStageHistory.createMany({
    data: [
      {
        id: "psh_001",
        projectId: project1.id,
        stageId: "stage_001",
        enteredAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        exitedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        id: "psh_002",
        projectId: project1.id,
        stageId: "stage_002",
        enteredAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
        exitedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        id: "psh_003",
        projectId: project1.id,
        stageId: "stage_003",
        enteredAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        exitedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        id: "psh_004",
        projectId: project1.id,
        stageId: "stage_004",
        enteredAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        exitedAt: null,
      },
    ],
  });

  // Create Assets
  console.log("🎵 Creating assets...");
  const assets = await prisma.asset.createMany({
    data: [
      {
        id: "asset_001",
        businessId: business.id,
        type: "Music",
        name: "Cinematic Strings Pack",
        vendor: "Epidemic Sound",
        licenseType: "Commercial",
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        cost: 19900, // $199
      },
      {
        id: "asset_002",
        businessId: business.id,
        type: "Font",
        name: "Montserrat Pro",
        vendor: "Google Fonts",
        licenseType: "Open Source",
        cost: 0,
      },
      {
        id: "asset_003",
        businessId: business.id,
        type: "Plugin",
        name: "Red Giant VFX Suite",
        vendor: "Red Giant",
        licenseType: "Subscription",
        expiresAt: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
        cost: 79900, // $799
      },
      {
        id: "asset_004",
        businessId: business.id,
        type: "LUT",
        name: "Cinematic Color Grades",
        vendor: "LUTIFY",
        licenseType: "Personal",
        cost: 4900, // $49
      },
      {
        id: "asset_005",
        businessId: business.id,
        type: "Stock Footage",
        name: "4K City B-Roll Collection",
        vendor: "Shutterstock",
        licenseType: "Commercial",
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        cost: 29900, // $299
      },
    ],
  });

  // Create Project Assets
  console.log("🔗 Linking assets to projects...");
  await prisma.projectAsset.createMany({
    data: [
      {
        id: "pa_001",
        projectId: project1.id,
        assetId: "asset_001",
      },
      {
        id: "pa_002",
        projectId: project1.id,
        assetId: "asset_003",
      },
      {
        id: "pa_003",
        projectId: project1.id,
        assetId: "asset_005",
      },
      {
        id: "pa_004",
        projectId: project2.id,
        assetId: "asset_001",
      },
      {
        id: "pa_005",
        projectId: project3.id,
        assetId: "asset_002",
      },
    ],
  });

  // Create Notes
  console.log("📝 Creating notes...");
  await prisma.note.createMany({
    data: [
      {
        id: "note_001",
        projectId: project1.id,
        type: "shot",
        content:
          "Establish shot of downtown skyline at golden hour - need 3-4 different angles",
      },
      {
        id: "note_002",
        projectId: project1.id,
        type: "client",
        content:
          "Client wants more emphasis on product features in the second act",
      },
      {
        id: "note_003",
        projectId: project1.id,
        type: "idea",
        content:
          "Consider adding motion graphics overlay during product demo scene",
      },
      {
        id: "note_004",
        projectId: project1.id,
        type: "todo",
        content: "Get final logo assets from client",
      },
      {
        id: "note_005",
        projectId: project2.id,
        type: "shot",
        content: "Interview scenes need ambient nature sounds",
      },
      {
        id: "note_006",
        projectId: project3.id,
        type: "client",
        content: "Add feature: time zone converter to the demo",
      },
    ],
  });

  // Create Time Entries
  console.log("⏱️  Creating time entries...");
  await prisma.timeEntry.createMany({
    data: [
      {
        id: "te_001",
        projectId: project1.id,
        userId: user1.id,
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        durationMinutes: 360,
        isBillable: true,
        source: "stopwatch",
      },
      {
        id: "te_002",
        projectId: project1.id,
        userId: user2.id,
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        durationMinutes: 480,
        isBillable: true,
        source: "stopwatch",
      },
      {
        id: "te_003",
        projectId: project2.id,
        userId: user1.id,
        durationMinutes: 240,
        isBillable: true,
        source: "manual",
      },
      {
        id: "te_004",
        projectId: project3.id,
        userId: user2.id,
        durationMinutes: 120,
        isBillable: true,
        source: "manual",
      },
      {
        id: "te_005",
        projectId: project4.id,
        userId: user1.id,
        durationMinutes: 180,
        isBillable: false,
        source: "manual",
      },
    ],
  });

  // Create Invoices with various statuses
  console.log("💰 Creating invoices...");
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        id: "inv_001",
        businessId: business.id,
        clientId: "client_001",
        projectId: project1.id,
        invoiceNumber: "CUT-2026-0001",
        currency: "USD",
        subtotalCents: 500000, // $5,000
        taxRateBps: 1000, // 10%
        taxAmountCents: 50000,
        totalCents: 550000, // $5,500
        amountPaidCents: 550000,
        amountDueCents: 0,
        status: "PAID",
        notes: "Professional video production services for product launch",
        issuedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        paidAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        emailSentAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.invoice.create({
      data: {
        id: "inv_002",
        businessId: business.id,
        clientId: "client_002",
        projectId: project2.id,
        invoiceNumber: "CUT-2026-0002",
        currency: "USD",
        subtotalCents: 750000, // $7,500
        taxRateBps: 1000, // 10%
        taxAmountCents: 75000,
        totalCents: 825000, // $8,250
        amountPaidCents: 825000,
        amountDueCents: 0,
        status: "PAID",
        notes: "Sustainability campaign documentary production",
        issuedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        paidAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        emailSentAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.invoice.create({
      data: {
        id: "inv_003",
        businessId: business.id,
        clientId: "client_003",
        projectId: project3.id,
        invoiceNumber: "CUT-2026-0003",
        currency: "USD",
        subtotalCents: 350000, // $3,500
        taxRateBps: 1000, // 10%
        taxAmountCents: 35000,
        totalCents: 385000, // $3,850
        amountPaidCents: 200000,
        amountDueCents: 185000,
        status: "PARTIALLY_PAID",
        notes: "SaaS product demo video",
        issuedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        paidAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        emailSentAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.invoice.create({
      data: {
        id: "inv_004",
        businessId: business.id,
        clientId: "client_004",
        projectId: project4.id,
        invoiceNumber: "CUT-2026-0004",
        currency: "USD",
        subtotalCents: 600000, // $6,000
        taxRateBps: 1000, // 10%
        taxAmountCents: 60000,
        totalCents: 660000, // $6,600
        amountPaidCents: 0,
        amountDueCents: 660000,
        status: "SENT",
        notes: "Fashion collection commercial - 30 second and 15 second cuts",
        issuedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        emailSentAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.invoice.create({
      data: {
        id: "inv_005",
        businessId: business.id,
        clientId: "client_001",
        invoiceNumber: "CUT-2026-0005",
        currency: "USD",
        subtotalCents: 200000, // $2,000
        taxRateBps: 1000, // 10%
        taxAmountCents: 20000,
        totalCents: 220000, // $2,200
        amountPaidCents: 0,
        amountDueCents: 220000,
        status: "DRAFT",
        notes: "Additional revisions and color grading",
      },
    }),
  ]);

  // Create Invoice Line Items
  console.log("📋 Creating invoice line items...");
  await prisma.invoiceLineItem.createMany({
    data: [
      {
        id: "ili_001",
        invoiceId: invoices[0].id,
        description: "Filming services (2 days crew)",
        quantity: 1,
        amountCents: 300000,
      },
      {
        id: "ili_002",
        invoiceId: invoices[0].id,
        description: "Post-production and editing (40 hours)",
        quantity: 40,
        amountCents: 5000,
      },
      {
        id: "ili_003",
        invoiceId: invoices[0].id,
        description: "Motion graphics and VFX",
        quantity: 1,
        amountCents: 200000,
      },
      {
        id: "ili_004",
        invoiceId: invoices[1].id,
        description: "Documentary production (5 days)",
        quantity: 1,
        amountCents: 500000,
      },
      {
        id: "ili_005",
        invoiceId: invoices[1].id,
        description: "Color grading and sound design",
        quantity: 1,
        amountCents: 250000,
      },
      {
        id: "ili_006",
        invoiceId: invoices[2].id,
        description: "Demo video production",
        quantity: 1,
        amountCents: 350000,
      },
      {
        id: "ili_007",
        invoiceId: invoices[3].id,
        description: "Commercial production and editing",
        quantity: 1,
        amountCents: 600000,
      },
      {
        id: "ili_008",
        invoiceId: invoices[4].id,
        description: "Revision rounds (3 rounds included)",
        quantity: 1,
        amountCents: 200000,
      },
    ],
  });

  // Create Payments
  console.log("💳 Creating payments...");
  await prisma.payment.createMany({
    data: [
      {
        id: "pay_001",
        businessId: business.id,
        invoiceId: invoices[0].id,
        amountCents: 550000,
        method: "BANK_TRANSFER",
        reference: "WIRE-2026-001",
        reconciledAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        reconciledByUserId: user1.id,
      },
      {
        id: "pay_002",
        businessId: business.id,
        invoiceId: invoices[1].id,
        amountCents: 825000,
        method: "CREDIT_CARD",
        reference: "CC-2026-002",
        reconciledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        reconciledByUserId: user1.id,
      },
      {
        id: "pay_003",
        businessId: business.id,
        invoiceId: invoices[2].id,
        amountCents: 200000,
        method: "BANK_TRANSFER",
        reference: "WIRE-2026-003",
        reconciledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        reconciledByUserId: user2.id,
      },
    ],
  });

  // Create Expenses
  console.log("💸 Creating expenses...");
  await prisma.expense.createMany({
    data: [
      {
        id: "exp_001",
        businessId: business.id,
        projectId: project1.id,
        amountCents: 50000, // $500
        currency: "USD",
        category: "Travel",
        description: "Transportation for filming crew and equipment",
        dateIncurred: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        id: "exp_002",
        businessId: business.id,
        projectId: project1.id,
        amountCents: 15000, // $150
        currency: "USD",
        category: "Equipment Rental",
        description: "Drone rental for aerial shots",
        dateIncurred: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        id: "exp_003",
        businessId: business.id,
        projectId: project2.id,
        amountCents: 25000, // $250
        currency: "USD",
        category: "Software",
        description: "Temporary Premiere Pro subscription",
        dateIncurred: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: "exp_004",
        businessId: business.id,
        amountCents: 75000, // $750
        currency: "USD",
        category: "Software",
        description: "Annual Adobe Creative Cloud subscription",
        dateIncurred: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      },
      {
        id: "exp_005",
        businessId: business.id,
        projectId: project1.id,
        amountCents: 30000, // $300
        currency: "USD",
        category: "Contractor",
        description: "Freelance sound designer for mixing",
        dateIncurred: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Create Invoice Reminders
  console.log("🔔 Creating invoice reminders...");
  await prisma.invoiceReminder.createMany({
    data: [
      {
        id: "reminder_001",
        businessId: business.id,
        invoiceId: invoices[2].id,
        tone: "gentle",
        channel: "email",
      },
      {
        id: "reminder_002",
        businessId: business.id,
        invoiceId: invoices[3].id,
        tone: "gentle",
        channel: "email",
      },
    ],
  });

  console.log("✅ Database seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   Users: 2`);
  console.log(`   Business: 1`);
  console.log(`   Clients: 4`);
  console.log(`   Projects: 4`);
  console.log(`   Invoices: 5 (various statuses)`);
  console.log(`   Payments: 3`);
  console.log(`   Expenses: 5`);
  console.log(`   Assets: 5`);
  console.log(`   Time Entries: 5`);
  console.log(`   Notes: 6`);
  console.log("\n🎯 Demo Users:");
  console.log(`   1. Alex Rivera (Admin) - alex@cutline.studio`);
  console.log(`   2. Jordan Chen (Member) - jordan@cutline.studio`);
  console.log("\n🎬 Demo Clients:");
  console.log(`   1. TechVision Marketing - sarah@techvision.com`);
  console.log(`   2. Eco Brands Co. - michael@ecobrands.com`);
  console.log(`   3. StreamFlow Analytics - emma@streamflow.io`);
  console.log(`   4. Fashion Forward Inc - david@fashionforward.com`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
