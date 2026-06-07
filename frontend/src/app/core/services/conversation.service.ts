import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Attachment,
  Conversation,
  CreateGroupDto,
  Message,
  MessageDto,
} from '../models/conversation.model';
import { ApiResponse } from '../models/response.model';
import { tap } from 'rxjs';
import { ChatService } from './chat.service';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private http = inject(HttpClient);
  private chatService = inject(ChatService);
  private apiUrl = `${environment.apiUrl}/conversations`;

  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<string | null>(null);
  messages = signal<MessageDto[]>([]);
  isLoadingHistory = signal(false);
  hasMoreMessages = signal(true);

  constructor() {
    this.chatService.messageReceived$.subscribe((message: MessageDto) => {
      const activeId = this.activeConversationId();

      if (activeId && message.conversationId === activeId) {
        this.messages.update((current) => {
          if (current.find((m) => m.id === message.id)) return current;
          return [...current, message];
        });
      }

      this.conversations.update((list) => {
        const index = list.findIndex((c) => c.id === message.conversationId);
        if (index === -1) return list;

        const updatedConversation: Conversation = {
          ...list[index],
          lastMessage: message.content || (message.attachments?.length ? 'Sent an attachment' : ''),
          lastMessageSentAt: message.sentAt,
        };

        const newList = [...list];
        newList.splice(index, 1);
        newList.unshift(updatedConversation);

        return newList;
      });
    });
  }

  loadMyConversations() {
    return this.http
      .get<ApiResponse<Conversation[]>>(this.apiUrl)
      .pipe(
        tap((res) => {
          if (res.success) {
            this.conversations.set(res.data);
          }
        }),
      )
      .subscribe();
  }

  loadInitialHistory(conversationId: string) {
    console.log('ConversationService: LOADING HISTORY FOR', conversationId);
    this.activeConversationId.set(conversationId);
    this.isLoadingHistory.set(true);
    this.hasMoreMessages.set(true);

    return this.http
      .get<ApiResponse<Message[]>>(`${this.apiUrl}/${conversationId}/messages?pageSize=30`)
      .pipe(
        tap((res) => {
          if (res.success) {
            console.log('ConversationService: HISTORY LOADED', res.data.length, 'messages');
            this.messages.set(res.data);
            if (res.data.length < 30) {
              this.hasMoreMessages.set(false);
            }
          }
          this.isLoadingHistory.set(false);
        }),
      );
  }

  loadOlderMessages(conversationId: string, beforeMessageId: string) {
    this.isLoadingHistory.set(true);
    return this.http
      .get<
        ApiResponse<Message[]>
      >(`${this.apiUrl}/${conversationId}/messages?beforeMessageId=${beforeMessageId}&pageSize=30`)
      .pipe(
        tap((res) => {
          if (res.success) {
            this.messages.update((current) => [...res.data, ...current]);
            if (res.data.length < 30) {
              this.hasMoreMessages.set(false);
            }
          }
          this.isLoadingHistory.set(false);
        }),
      );
  }

  createPrivateConversation(targetUsername: string) {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/private/${targetUsername}`, {});
  }

  createGroup(dto: CreateGroupDto) {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/group`, dto);
  }

  getConversation(conversationId: string) {
    return this.http.get<ApiResponse<Conversation>>(`${this.apiUrl}/${conversationId}`);
  }

  addGroupMember(conversationId: string, userId: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${conversationId}/members`, { userId });
  }

  removeGroupMember(conversationId: string, userId: string) {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${conversationId}/members/${userId}`);
  }

  leaveGroup(conversationId: string) {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${conversationId}/leave`);
  }

  uploadAttachments(files: File[]) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    return this.http.post<ApiResponse<Attachment[]>>(
      `${environment.apiUrl}/files/upload`,
      formData,
    );
  }

  pushMessage(message: MessageDto) {
    if (!message) return;
    console.log('ConversationService: MANUAL PUSH', message);
    const activeId = this.activeConversationId();
    const msgConversationId = message.conversationId || activeId;

    if (activeId && msgConversationId === activeId) {
      this.messages.update((current) => {
        if (current.find((m) => m.id === message.id)) return current;
        return [...current, message];
      });
    }

    if (msgConversationId) {
      this.conversations.update((list) => {
        return list.map((conv) => {
          if (conv.id === msgConversationId) {
            return {
              ...conv,
              lastMessage: message.content,
              lastMessageSentAt: message.sentAt,
            };
          }
          return conv;
        });
      });
    }
  }
}
