export type NotificationChannelType = 'email' | 'sms' | 'whatsapp';

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  whatsapp?: string;
  name?: string;
}

export interface NotificationContent {
  text: string;
  html?: string;
}

export interface NotificationMessage {
  channel: NotificationChannelType;
  recipient: NotificationRecipient;
  subject?: string;
  content: NotificationContent;
  metadata?: Record<string, string | number | boolean>;
}
