'use server';

import prisma from '@/modules/core/db/prisma';
import { createAdminNotification } from '@/lib/admin-notifications';

export async function submitContactForm(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;
  const source = (formData.get('source') as string) || 'Website Contact';

  if (!name || !email || !message) {
    return { error: 'Please fill out all fields.' };
  }

  try {
    await prisma.systemContactMessage.create({
      data: {
        name,
        email,
        message,
        source,
      }
    });

    await createAdminNotification({
      title: 'New Contact Message',
      message: `${name} (${email}) has sent a message via ${source}.`,
      type: 'message',
      actionUrl: '/hq/messages',
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error in contact action:', err);
    return { error: 'Something went wrong.' };
  }
}
