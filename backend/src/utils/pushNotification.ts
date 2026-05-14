interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token.startsWith('ExponentPushToken[')) return;

  const message: ExpoPushMessage = { to: token, sound: 'default', title, body };
  if (data) message.data = data;

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error('[Push] Expo push error:', await res.text());
    }
  } catch (err) {
    console.error('[Push] Failed to send push notification:', err);
  }
}
