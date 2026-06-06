import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../core/services/conversation.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { Profile } from '../../../core/models/profile.model';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-layout.component.html',
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);
  protected chatService = inject(ChatService);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  searchQuery = signal('');
  searchResults = signal<Profile[]>([]);

  ngOnInit(): void {
    this.conversationService.loadMyConversations();

    const currentId = this.conversationService.activeConversationId();
    if (currentId) {
      this.chatService.joinRoom(currentId);
    }

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  ngOnDestroy(): void {
    const currentId = this.conversationService.activeConversationId();
    if (currentId) {
      this.chatService.leaveRoom(currentId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery());
  }

  private performSearch(query: string) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= 3) {
      this.userService.searchUsers(trimmedQuery).subscribe({
        next: (res) => {
          if (res.success) {
            this.searchResults.set(res.data);
          }
        },
      });
    } else {
      this.searchResults.set([]);
    }
  }

  startChat(username: string) {
    this.conversationService.createPrivateConversation(username).subscribe({
      next: (res) => {
        if (res.success) {
          this.searchQuery.set('');
          this.searchResults.set([]);
          this.conversationService.loadMyConversations();
          const conversationId = res.data;
          if (conversationId) {
            this.selectConversation(conversationId);
          }
        }
      },
    });
  }

  selectConversation(id: string) {
    const previousId = this.conversationService.activeConversationId();
    if (previousId) {
      this.chatService.leaveRoom(previousId);
    }

    this.conversationService.loadMyConversations();
    this.conversationService.loadInitialHistory(id).subscribe(() => {
      this.chatService.joinRoom(id);
    });
  }

  sendMessage(inputElement: HTMLInputElement) {
    const content = inputElement.value.trim();
    const conversationId = this.conversationService.activeConversationId();

    if (content && conversationId) {
      this.chatService
        .sendMessage(conversationId, content)
        .then((message) => {
          if (message) {
            this.conversationService.pushMessage(message);
          }
          inputElement.value = '';
        })
        .catch((err) => console.error('Failed to send message', err));
    }
  }
}
