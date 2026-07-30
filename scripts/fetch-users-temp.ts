/**
 * Script: fetch-users-temp.ts
 * Purpose: A quick diagnostic script to query and print all `User` records 
 *          from the database in JSON format.
 * 
 * Why this exists:
 * - Often used during early development or debugging to quickly verify 
 *   that the Clerk webhook successfully inserted a user into the DB, or to 
 *   check the structure of the user records without opening Prisma Studio.
 */
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
