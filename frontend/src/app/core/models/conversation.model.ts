export interface Attachment {
  url: string;
  type: string;
  fileName: string;
}

export interface ConversationMember {
  userId: string;
  userName: string;
  displayName: string;
  pictureUrl?: string;
  isAdmin: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageSentAt?: string;
  pictureUrl?: string;
  imageUrl?: string;
  members?: ConversationMember[];
}

export interface Message {
  id: string;
  conversationId: string;
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
