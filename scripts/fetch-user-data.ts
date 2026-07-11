import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function exportUserData() {
  console.log("Fetching users with their associated projects and financial information...")
  
  try {
    const users = await prisma.user.findMany({
      include: {
        // Users are connected to businesses via memberships
        memberships: {
          include: {
            business: {
              include: {
                // Fetch the projects tied to the business
                projects: {
                  include: {
                    client: true // Include client info for the project
                  }
                },
                // Fetch the financial information tied to the business
                invoices: {
                  include: {
                    lineItems: true,
                    payments: true
                  }
                },
                expenses: true
              }
            }
          }
        }
      }
    })

    // Because this data can be massive, we will save it to a JSON file instead of flooding the terminal
    const outputPath = 'user-data-export.json';
    fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
    
    console.log(`\n✅ Successfully fetched ${users.length} users!`)
    console.log(`📂 All data (including projects and financials) has been saved to: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Error fetching user data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportUserData()
