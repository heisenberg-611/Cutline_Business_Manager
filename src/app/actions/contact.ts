'use server';

import prisma from '@/modules/core/db/prisma';

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

    return { success: true };
  } catch (err: any) {
    console.error('Error in contact action:', err);
    return { error: 'Something went wrong.' };
  }
}
