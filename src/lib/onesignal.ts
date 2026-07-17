type OneSignalNotification = {
  app_id: string;
  included_segments?: string[];
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  headings?: { [key: string]: string };
  contents: { [key: string]: string };
  url?: string;
  data?: Record<string, unknown>;
};

/**
 * Sends a push notification using OneSignal REST API.
 * @param title The title of the notification
 * @param message The body message of the notification
 * @param targetUserIds Array of user IDs (external IDs) to target. If undefined, sends to 'Active Users' segment.
 * @param url Optional URL to open when the notification is clicked
 */
export async function sendPushNotification(
  title: string,
  message: string,
  targetUserIds?: string[],
  url?: string
) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    console.warn("OneSignal credentials are not set. Skipping push notification.");
    return;
  }

  const payload: OneSignalNotification = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    url,
  };

  if (targetUserIds && targetUserIds.length > 0) {
    payload.include_external_user_ids = targetUserIds;
  } else {
    payload.included_segments = ["Active Users"];
  }

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send OneSignal push notification:", errorData);
      throw new Error("OneSignal API error");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}
