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

    const { from, to, subject, html, text } = payload.data;

    const toAddressStr = to.join(', ').toLowerCase();
    
    // Get the destination email from environment variables, fallback to a catch-all
    let forwardTo = process.env.PERSONAL_FORWARD_EMAIL;

    if (toAddressStr.includes('sales@')) {
      forwardTo = process.env.SALES_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    } else if (toAddressStr.includes('support@')) {
      forwardTo = process.env.SUPPORT_FORWARD_EMAIL || process.env.PERSONAL_FORWARD_EMAIL;
    }
    
    if (!forwardTo) {
      console.warn('Inbound webhook received but PERSONAL_FORWARD_EMAIL is not set in environment.');
      return NextResponse.json({ success: false, message: 'Forwarding email not configured' }, { status: 500 });
    }

    // Forward the email using Resend
    const { error } = await resend.emails.send({
      from: 'contact@cutlin.tech', // Must be your verified sending domain
      to: forwardTo,
      replyTo: from, // So hitting 'Reply' in your Gmail replies directly to the original sender
      subject: `[Forwarded] ${subject}`,
      html: `
        <div style="background-color: #f4f4f5; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
          <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${from}</p>
          <p style="margin: 0 0 8px 0;"><strong>To:</strong> ${to.join(', ')}</p>
          <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
        </div>
        <div>
          ${html || text}
        </div>
      `,
    });

    if (error) {
      console.error('Failed to forward email:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing inbound webhook:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
