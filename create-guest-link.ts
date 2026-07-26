import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const business = await prisma.business.findFirst()
  if (!business) return console.log("No business found")

  const token = crypto.randomUUID()
  
  const conversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      type: 'GUEST_LINK',
      guestToken: token,
      createdBy: 'system',
      title: 'Automated Test Chat',
    }
  })

  console.log(`GUEST_LINK: http://localhost:3000/chat/${token}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
