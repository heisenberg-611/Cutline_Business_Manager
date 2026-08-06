import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: any;

    // If you added RESEND_WEBHOOK_SECRET to your .env, we'll verify it securely
    if (process.env.RESEND_WEBHOOK_SECRET) {
      const headerPayload = await headers();
      const svix_id = headerPayload.get('svix-id');
      const svix_timestamp = headerPayload.get('svix-timestamp');
      const svix_signature = headerPayload.get('svix-signature');

      if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json({ success: false, message: 'Missing Svix headers' }, { status: 400 });
      }

      const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);

      try {
        payload = wh.verify(rawBody, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err) {
        console.error('Error verifying Resend webhook:', err);
        return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 400 });
      }
    } else {
      // Fallback if secret isn't set yet
      payload = JSON.parse(rawBody);
    }

    // Verify it's an email.received event
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true, message: 'Ignored non-receive event' });
    }

    const { to } = payload.data;

    // Handle both array and string formats for 'to' field securely
    const toArray = Array.isArray(to) ? to : [to];
    const toAddressStr = toArray.join(', ').toLowerCase();

    // Get the destination email from environment variables, fallback to a catch-all
    let forwardTo = process.env.PERSONAL_FORWARD_EMAIL;

    if (toAddressStr.includes('sales@')) {
      forwardTo = process.env.SALES_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    } else if (toAddressStr.includes('support@')) {
      forwardTo = process.env.SUPPORT_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    } else if (toAddressStr.includes('privacy@')) {
      forwardTo = process.env.PRIVACY_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    } else if (toAddressStr.includes('invoice@')) {
      forwardTo = process.env.INVOICE_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    } else if (toAddressStr.includes('contact@')) {
      forwardTo = process.env.CONTACT_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    }

    if (!forwardTo) {
      console.warn('Inbound webhook received but PERSONAL_FORWARD_EMAIL is not set in environment.');
      // Return 200 to acknowledge receipt so Resend doesn't disable the webhook
      return NextResponse.json({ success: false, message: 'Forwarding email not configured' }, { status: 200 });
    }

    // We manually fetch and forward the email to have full control over the Reply-To header
    // so that when you hit "Reply", you reply to the original sender instead of the forwarding address.
    const emailRecord = await resend.emails.receiving.get(payload.data.email_id);
    let error = emailRecord.error;

    if (!error && emailRecord.data) {
      const emailBody = emailRecord.data;

      const forwardRes = await resend.emails.send({
        from: 'contact@cutlin.tech',
        to: forwardTo,
        replyTo: payload.data.from,
        subject: `Fwd: ${payload.data.subject}`,
        html: `
          <div style="background-color: #f4f4f5; padding: 16px; margin-bottom: 24px; border-radius: 8px; font-family: sans-serif;">
            <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${payload.data.from}</p>
            <p style="margin: 0 0 8px 0;"><strong>To:</strong> ${toAddressStr}</p>
            <p style="margin: 0;"><strong>Subject:</strong> ${payload.data.subject}</p>
          </div>
          <div>
            ${emailBody.html || emailBody.text || payload.data.html || payload.data.text || '<p>No content found</p>'}
          </div>
        `
      });
      error = forwardRes.error;
    }

    if (error) {
      console.error('Failed to forward email:', error);
      // Return 200 to acknowledge receipt so Resend doesn't disable the webhook
      return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing inbound webhook:', error);
    // Return 200 even on unhandled exceptions to avoid webhook disablement, but log it
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 200 });
  }
}
