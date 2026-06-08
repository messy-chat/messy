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
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private http = inject(HttpClient);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private apiUrl = `${environment.apiUrl}/conversations`;

  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<string | null>(null);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<MessageDto[]>([]);
  isLoadingHistory = signal(false);
  hasMoreMessages = signal(true);

  constructor() {
    this.initRealTimeListeners();
  }

  private initRealTimeListeners() {
    // Listen for new messages
    this.chatService.messageReceived$.subscribe((message: MessageDto) => {
      const activeId = this.activeConversationId();

      if (activeId && message.conversationId === activeId) {
        this.messages.update((current) => {
          if (current.find((m) => m.id === message.id)) return current;
          return [...current, message];
        });
      }

      this.updateConversationLastMessage(message);
    });

    // Listen for new conversations (e.g. being added to a group)
    this.chatService.conversationCreated$.subscribe((conv) => {
      this.conversations.update((current) => {
        if (current.find((c) => c.id === conv.id)) return current;
        return [conv, ...current];
      });
    });

    // Listen for conversation updates (name/image)
    this.chatService.conversationUpdated$.subscribe((data) => {
      this.conversations.update((list) =>
        list.map((c) =>
          c.id === data.id
            ? { ...c, name: data.name || c.name, imageUrl: data.imageUrl || c.imageUrl }
            : c,
        ),
      );

      if (this.activeConversationId() === data.id) {
        this.activeConversation.update((c) =>
          c ? { ...c, name: data.name || c.name, imageUrl: data.imageUrl || c.imageUrl } : c,
        );
      }
    });

    // Listen for member added
    this.chatService.memberAdded$.subscribe((data) => {
      if (this.activeConversationId() === data.conversationId) {
        this.activeConversation.update((c) => {
          if (!c) return c;
          const currentMembers = c.members || [];
          if (currentMembers.find((m) => m.userId === data.member.userId)) return c;
          return { ...c, members: [...currentMembers, data.member] };
        });
      }
    });

    // Listen for member removed
    this.chatService.memberRemoved$.subscribe((data) => {
      if (this.activeConversationId() === data.conversationId) {
        const myId = this.userService.profile()?.id;
        if (data.userId === myId) {
          // If I was removed, clear active conversation
          this.activeConversationId.set(null);
          this.activeConversation.set(null);
          this.messages.set([]);
        } else {
          this.activeConversation.update((c) => {
            if (!c || !c.members) return c;
            return { ...c, members: c.members.filter((m) => m.userId !== data.userId) };
          });
        }
      }
    });
  }

  private updateConversationLastMessage(message: MessageDto) {
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
  }

  loadMyConversations() {
    return this.http.get<ApiResponse<Conversation[]>>(this.apiUrl).pipe(
      tap((res) => {
        if (res.success) {
          this.conversations.set(res.data);
        }
      }),
    );
  }

  loadInitialHistory(conversationId: string) {
    this.activeConversationId.set(conversationId);
    this.isLoadingHistory.set(true);
    this.hasMoreMessages.set(true);

    return this.http
      .get<ApiResponse<Message[]>>(`${this.apiUrl}/${conversationId}/messages?pageSize=30`)
      .pipe(
        tap((res) => {
          if (res.success) {
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

  loadConversationDetails(id: string) {
    return this.http.get<ApiResponse<Conversation>>(`${this.apiUrl}/${id}`).pipe(
      tap((res) => {
        if (res.success) {
          this.activeConversation.set(res.data);
        }
      }),
    );
  }

  createPrivateConversation(targetUsername: string) {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/private/${targetUsername}`, {});
  }

  createGroup(dto: CreateGroupDto) {
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/group`, dto);
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

  updateConversationName(conversationId: string, name: string) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${conversationId}/name`, { name });
  }

  uploadGroupImage(conversationId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/${conversationId}/image`, formData);
  }

  uploadAttachments(files: File[]) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    return this.http.post<ApiResponse<Attachment[]>>(
      `${environment.apiUrl}/files/upload`,
      formData,
    );
  }
}
