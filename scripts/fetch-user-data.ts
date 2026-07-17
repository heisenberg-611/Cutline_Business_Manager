import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function exportUserData() {
  console.log("Fetching users with their associated projects and financial information...")
  
  try {
    const rawUsers = await prisma.user.findMany({
      include: {
        notifications: true,
        memberships: {
          include: {
            business: {
              include: {
                clients: true,
                projects: {
                  include: {
                    client: true,
                    statusStage: true,
                    stageHistory: true,
                    invoices: true,
                    notes: true,
                    links: true,
                    timeEntries: true,
                    assets: true,
                    expenses: true,
                    feedbackRequests: true,
                    testimonials: true,
                    reviewRequests: true
                  }
                },
                projectRequests: true,
                workflowTemplates: {
                  include: {
                    stages: true
                  }
                },
                invoices: {
                  include: {
                    lineItems: true,
                    payments: true,
                    creditNotes: true,
                    reminders: true
                  }
                },
                assets: true,
                payments: true,
                expenses: true,
                creditNotes: true,
                invoiceReminders: true,
                auditLogs: true,
                feedbackRequests: true,
                feedbackResponses: true,
                testimonials: true,
                reviewRequests: true,
                analyticsSnapshots: true
              }
            }
          }
        }
      }
    })

    // Process the users to enforce role-based access controls
    const users = rawUsers.map(user => {
      // Process memberships
      const processedMemberships = user.memberships.map(membership => {
        const isMember = membership.role !== 'org:admin';

        if (isMember && membership.business) {
          // 1. Filter projects to only those assigned to the user
          const assignedProjects = membership.business.projects.filter(
            p => p.assigneeId === user.id
          ).map(p => ({
            ...p,
            // 2. Sanitize client data for the assigned projects
            client: p.client ? {
              ...p.client,
              email: null,
              phone: null,
              industry: null,
              preferredChannel: null,
              internalRating: null,
            } : p.client
          }));

          // 3. Strip out org-wide data that members shouldn't see
          return {
            ...membership,
            business: {
              ...membership.business,
              projects: assignedProjects,
              clients: [], // Members cannot see the raw client list
              invoices: [], // Prevent access to org-wide financials
              payments: [],
              expenses: [],
              creditNotes: [],
              invoiceReminders: [],
              auditLogs: [],
              notifications: [], // Prevent access to org-wide notifications
              analyticsSnapshots: [],
              projectRequests: [], // Intake forms are usually admin/manager only
            }
          };
        }

        // Admins see everything
        return membership;
      });

      return {
        ...user,
        memberships: processedMemberships
      };
    });

    const outputPath = 'scripts/user-data-export.json';
    fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
    
    console.log(`\n✅ Successfully fetched and scoped data for ${users.length} users!`)
    console.log(`📂 All data (including scoped projects and financials) has been saved to: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Error fetching user data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportUserData()
