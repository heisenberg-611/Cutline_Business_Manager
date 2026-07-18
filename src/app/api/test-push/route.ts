import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/onesignal';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    
    console.log("Testing push for userId:", userId);
    
    // Test push to specific user
    const result = await sendPushNotification(
      "Direct API Test",
      "This is a test directly from the Next.js API route to your user ID!",
      [userId]
    );

    return NextResponse.json({ success: true, userId, result });
  } catch (error: any) {
    console.error("Test push error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
