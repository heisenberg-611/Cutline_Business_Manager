import prisma from '@/modules/core/db/prisma';
import { sendPushNotification } from './onesignal';

export async function createAdminNotification({
  title,
  message,
  type,
  actionUrl,
}: {
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
}) {
  try {
    // 1. Create DB notification
    await prisma.adminNotification.create({
      data: {
        title,
        message,
        type,
        actionUrl,
      },
    });

    // 2. Fetch all admins to notify via OneSignal
    const admins = await prisma.globalAdmin.findMany({ select: { email: true } });
    if (admins.length > 0) {
      const adminExternalIds = admins.map((a) => `admin_${a.email}`);
      // Only include absolute URLs for OneSignal url (it requires http/https)
      // Since actionUrl is a relative path (e.g. /hq/messages), we can try to append the base URL
      // If NEXT_PUBLIC_APP_URL is not set, we might omit it, but let's try to pass it if absolute,
      // or construct it. OneSignal requires absolute URLs.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.cutlin.tech';
      const absoluteUrl = actionUrl ? (actionUrl.startsWith('http') ? actionUrl : `${baseUrl}${actionUrl}`) : undefined;
      
      await sendPushNotification(title, message, adminExternalIds, absoluteUrl);
    }
  } catch (error) {
    console.error('Failed to create admin notification:', error);
  }
}
