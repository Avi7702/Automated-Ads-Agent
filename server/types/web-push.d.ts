declare module 'web-push' {
  interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }

  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(subscription: PushSubscription, payload: string): Promise<SendResult>;
}
