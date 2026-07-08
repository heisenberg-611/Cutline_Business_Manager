# Database Seed Script

This directory contains a comprehensive seed script that populates your Cutline database with realistic demo data for testing and demonstration purposes.

## Overview

The `seed.ts` script creates a complete demo environment including:

### Business & Users
- **Business**: "Cutline Studios Demo" (org_test_demo)
- **Users**: 2 team members with different roles
  - Alex Rivera (Admin) - alex@cutline.studio
  - Jordan Chen (Member) - jordan@cutline.studio

### Clients (4)
1. **TechVision Marketing** - High-tech company (Rating: ⭐⭐⭐⭐⭐)
2. **Eco Brands Co.** - Sustainability-focused (Rating: ⭐⭐⭐⭐)
3. **StreamFlow Analytics** - SaaS company (Rating: ⭐⭐⭐⭐⭐)
4. **Fashion Forward Inc** - Fashion brand (Rating: ⭐⭐⭐)

### Projects (4)
1. **TechVision Product Launch Video** - Commercial (Status: Editing)
2. **Eco Brands Sustainability Campaign** - Documentary (Status: Pre-Production)
3. **StreamFlow Analytics Demo** - Tutorial (Status: Delivery)
4. **Fashion Forward Spring Collection** - Commercial (Status: Concept)

### Financial Data
- **Invoices**: 5 invoices with various statuses
  - 2 × PAID ($5,500 + $8,250)
  - 1 × PARTIALLY_PAID ($3,850)
  - 1 × SENT ($6,600)
  - 1 × DRAFT ($2,200)
- **Payments**: 3 recorded payments via Bank Transfer & Credit Card
- **Expenses**: 5 expenses including travel, equipment, software, and contractors
- **Credit Notes & Reminders**: Demo reminders for overdue invoices

### Workflow & Production
- **Workflow Template**: "Standard Video Production" with 6 stages
  1. Concept (8h)
  2. Pre-Production (16h)
  3. Filming (24h)
  4. Editing (40h) ← Billing trigger
  5. Revisions (16h)
  6. Delivery (4h) ← Billing trigger
- **Stage History**: Tracked progression through workflow stages
- **Time Entries**: 5 billable time entries (96+ hours tracked)
- **Notes**: 6 project notes (shots, client feedback, ideas, todos)

### Assets & Resources
- **Music**: Cinematic Strings Pack (Epidemic Sound)
- **Font**: Montserrat Pro (Google Fonts)
- **Plugin**: Red Giant VFX Suite
- **LUT**: Cinematic Color Grades
- **Stock Footage**: 4K City B-Roll Collection
- Linked to relevant projects

## How to Run

### Prerequisites
1. Ensure your `.env.local` file has a valid `DATABASE_URL` pointing to your PostgreSQL database
2. Run migrations first if needed:
   ```bash
   npx prisma migrate dev
   ```

### Run the Seed Script

```bash
npm run seed
```

Or with `npx` directly:

```bash
npx tsx scripts/seed.ts
```

### Reset the Database

To delete all data without creating new records:

```bash
npm run reset-db
```

Then create fresh demo data:

```bash
npm run seed
```

### What It Does
1. **Clears existing data** - Deletes all records in the correct dependency order
2. **Creates demo data** - Populates realistic business data
3. **Displays summary** - Shows what was created

## Sample Data Details

### Invoice Examples
- **Paid Invoice (CUT-2026-0001)**: $5,500 for product launch video
  - Line items: Filming, editing, motion graphics
  - Paid 20 days ago
  
- **Partially Paid (CUT-2026-0003)**: $3,850 for SaaS demo
  - $2,000 paid, $1,850 outstanding
  - Good for testing AR aging reports

- **Draft Invoice (CUT-2026-0005)**: $2,200 for revisions
  - Not yet sent to client
  - Test invoice editing workflow

### Time Tracking
- Entries tracked via stopwatch and manual entry
- Mix of billable and non-billable hours
- Distributed across projects and team members

### Project Stages
First project (TechVision) shows full workflow progression:
- Concept → Pre-Production → Filming → Editing (current)
- 20 days in production with realistic timeline

## Testing Scenarios

This seed data is perfect for testing:

✅ **Financial Dashboard**
- Invoice status distribution
- Aging buckets (PAID, PARTIALLY_PAID, SENT, OVERDUE)
- Revenue tracking

✅ **Pipeline/Workflow**
- Project progression through stages
- Stage history and timeline
- Deadline tracking

✅ **Client Management**
- Multi-client operations
- Client rating system
- Industry grouping

✅ **Time Tracking & Billing**
- Billable vs non-billable hours
- Project profitability analysis
- Team member allocation

✅ **Asset Management**
- License expiration tracking
- Cost allocation by project
- Reusable asset library

✅ **Reporting**
- Revenue by client/project
- Expense categorization
- Production timeline analysis

## Resetting the Database

To clear all data and start fresh:

```bash
# Option 1: Just delete data (no new data created)
npm run reset-db

# Option 2: Delete and immediately reseed
npm run reset-db && npm run seed

# Option 3: Use Prisma
npx prisma migrate reset
```

## Customization

You can modify `scripts/seed.ts` to:
- Add more clients or projects
- Adjust currency amounts
- Change invoice statuses and dates
- Add more assets or workflow stages
- Modify team member details

After changes, simply run `npm run seed` again to regenerate the demo data.

## Troubleshooting

### Error: "Cannot find module 'tsx'"
```bash
npm install --save-dev tsx
```

### Error: "no DATABASE_URL"
Ensure your `.env.local` has a valid PostgreSQL connection string:
```
DATABASE_URL="postgresql://user:password@localhost:5432/cutline_dev"
```

### Error: "relation does not exist"
Run migrations first:
```bash
npx prisma migrate dev
```

## Notes

- Demo user IDs follow pattern `user_test_*` and `org_test_*`
- All dates are relative to "now" so data stays current
- Clerk webhook sync is assumed to have already created users/businesses
- For production, replace with real Clerk organization/user IDs
