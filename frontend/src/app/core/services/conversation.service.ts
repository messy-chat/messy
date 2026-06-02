import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Conversation, Message } from '../models/conversation.model';
import { ApiResponse } from '../models/response.model';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/conversations`;

  conversations = signal<Conversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<Message[]>([]);
  isLoadingHistory = signal(false);
  hasMoreMessages = signal(true);

  loadMyConversations() {
    return this.http.get<ApiResponse<Conversation[]>>(this.apiUrl).pipe(
      tap((res) => {
        if (res.success) {
          this.conversations.set(res.data);
        }
      }),
    ).subscribe();
  }

  loadInitialHistory(conversationId: number) {
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

  loadOlderMessages(conversationId: number, beforeMessageId: number) {
    this.isLoadingHistory.set(true);
    return this.http
      .get<ApiResponse<Message[]>>(
        `${this.apiUrl}/${conversationId}/messages?beforeMessageId=${beforeMessageId}&pageSize=30`,
      )
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
}
