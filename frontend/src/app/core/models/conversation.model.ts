export interface Attachment {
  url: string;
  type: string;
  fileName: string;
}

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
  attachments?: Attachment[];
}

export interface MessageDto {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
  attachments?: Attachment[];
}

export interface CreateGroupDto {
  name: string;
  memberUserIds: string[];
}
