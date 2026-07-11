import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fetchUsers() {
  try {
    const users = await prisma.user.findMany()
    console.log(JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fetchUsers()
