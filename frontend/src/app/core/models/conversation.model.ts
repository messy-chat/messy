export interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageSentAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface MessageDto {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface CreateGroupDto {
  name: string;
  memberUserIds: string[];
}
