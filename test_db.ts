import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log("USERS:", users)
  
  const memberships = await prisma.businessMembership.findMany({ include: { user: true } })
  console.log("MEMBERSHIPS:", memberships)
}
main().catch(console.error).finally(() => prisma.$disconnect())
