import { Client } from '@upstash/qstash'

// Lazy initialization to prevent Upstash from spamming the console 
// on every module load if the token is missing in local dev.
let qstashClient: Client | null = null

function getQStashClient() {
  if (!qstashClient && process.env.QSTASH_TOKEN) {
    qstashClient = new Client({ token: process.env.QSTASH_TOKEN })
  }
  return qstashClient
}

export async function triggerPdfGeneration(invoiceId: string, orgId: string) {
  const client = getQStashClient()
  if (!client) {
    console.warn('QSTASH_TOKEN is not set, skipping background PDF generation.')
    return
  }
  
  // The absolute URL of our Vercel app webhook endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  const webhookUrl = `${baseUrl}/api/webhooks/qstash/pdf`

  try {
    await client.publishJSON({
      url: webhookUrl,
      body: { invoiceId, orgId },
      // Optional: Prevent duplicates in case of quick rapid edits (but here we want the latest to generate, so we'll omit deduplicationId to allow it to overwrite)
    })
  } catch (error) {
    console.error('Failed to trigger QStash PDF generation:', error)
  }
}
