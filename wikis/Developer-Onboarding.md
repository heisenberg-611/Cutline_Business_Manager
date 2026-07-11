## Developer Onboarding & Setup

Welcome to the Cutline OS repository! Follow this guide to get your local development environment up and running smoothly.

### Prerequisites
Before you begin, ensure you have the following installed and set up on your machine:
* **Node.js** (v18 or newer)
* **PostgreSQL** (Running via a Local instance, Docker, or a cloud provider like Aiven/Supabase)
* **Clerk Account** (For Authentication & Organizations functionality)
* **Resend Account** (For Email sending integrations)

### Environment Variables
Create a `.env.local` file in the root of the project. Use the following template to wire up the integrations:

```env
# Database Connection (For Prisma Accelerate)
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
# Direct connection to the database (Required for Prisma migrations)
DIRECT_URL="postgresql://username:password@host:port/dbname?sslmode=require"

# Clerk Auth (Development Keys - Get these from your Clerk Dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL="/sign-in"

# Resend API Key (For transactional emails)
RESEND_API_KEY=re_...
```

### Prisma Acceleration & Database Polling

This project utilizes **Prisma Accelerate** for connection pooling and query caching to optimize performance. Ensure you configure both `DATABASE_URL` (accelerated endpoint) and `DIRECT_URL` (direct database connection for migrations).
*Note: Never commit your `.env.local` file to version control. Only use "Development" keys for local testing to avoid polluting production data.*

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/cutline-os.git
   cd cutline-os
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run Prisma Migrations:**
   This will apply the schema to your Postgres database and generate the Prisma Client, giving you full TypeScript autocomplete for the database.
   ```bash
   npx prisma migrate dev
   ```
4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment
Cutline OS is optimized for zero-config deployment on Vercel.
1. Connect your GitHub repository to your Vercel account.
2. Add all the environment variables in the Vercel dashboard. **CRITICAL: Make sure to use Production keys** for Clerk and Resend, and your production Database URL.
3. Ensure your `build` command is set to: `prisma generate && next build`.
4. Vercel will automatically deploy the `main` branch on every push.
