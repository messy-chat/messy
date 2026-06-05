export interface Conversation {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageSentAt?: string;
}

export interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}
