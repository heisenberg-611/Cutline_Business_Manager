'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { ContactFormEmail } from '@/emails/contact-form';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitContactForm(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !message) {
    return { error: 'Please fill out all fields.' };
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('STUBBING EMAIL (No RESEND_API_KEY found):', { name, email, message });
    return { success: true };
  }

  try {
    const htmlContent = await render(React.createElement(ContactFormEmail, { name, email, message }));

    const { error } = await resend.emails.send({
      from: 'contact@cutlin.tech', // Verified domain
      to: 'support@cutlin.tech', // Your team's inbox
      replyTo: email,
      subject: `New Contact Request from ${name}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send contact email:', error);
      return { error: 'Failed to send message. Please try again.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in contact action:', err);
    return { error: 'Something went wrong.' };
  }
}
