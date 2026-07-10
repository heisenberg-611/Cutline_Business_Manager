import { NextResponse } from 'next/server'
import prisma from '@/modules/core/db/prisma'
import { Client } from '@upstash/qstash'

// Lazy initialization
let qstashClient: Client | null = null
function getQStashClient() {
  if (!qstashClient && process.env.QSTASH_TOKEN) {
    qstashClient = new Client({ token: process.env.QSTASH_TOKEN })
  }
  return qstashClient
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Optional: verify this came from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Fetch all business IDs
    const businesses = await prisma.business.findMany({
      select: { id: true }
    })
    
    const businessIds = businesses.map(b => b.id)
    const BATCH_SIZE = 5
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
    const webhookUrl = `${baseUrl}/api/webhooks/qstash/analytics`

    let batchesDispatched = 0

    // Fan-out to QStash in chunks
    for (let i = 0; i < businessIds.length; i += BATCH_SIZE) {
      const chunk = businessIds.slice(i, i + BATCH_SIZE)
      const client = getQStashClient()
      
      if (client) {
        await client.publishJSON({
          url: webhookUrl,
          body: { businessIds: chunk },
          // Optional: deduplicationId to prevent duplicate runs on the same day
          deduplicationId: `analytics-cron-${new Date().toISOString().split('T')[0]}-batch-${i}`
        })
        batchesDispatched++
      } else {
        console.warn('QSTASH_TOKEN not set, skipping analytics fan-out for batch:', chunk)
      }
    }

    return NextResponse.json({ 
      success: true, 
      businessesProcessed: businessIds.length,
      batchesDispatched 
    })
  } catch (error) {
    console.error('Failed to trigger analytics cron:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
