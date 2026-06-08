export interface Attachment {
  url: string;
  type: string;
  fileName: string;
}

export interface ConversationMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageSentAt?: string;
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
  conversationId: string;
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

export interface ConversationUpdatedEvent {
  id: string;
  name?: string;
  imageUrl?: string;
}

export interface MemberAddedEvent {
  conversationId: string;
  member: ConversationMember;
}

export interface MemberRemovedEvent {
  conversationId: string;
  userId: string;
}
