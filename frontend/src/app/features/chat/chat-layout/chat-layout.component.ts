import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../core/services/conversation.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { Profile } from '../../../core/models/profile.model';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-layout.component.html',
})
export class ChatLayoutComponent implements OnInit, AfterViewChecked, OnDestroy {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);
  protected chatService = inject(ChatService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private shouldScrollToBottom = false;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  searchQuery = signal('');
  searchResults = signal<Profile[]>([]);

  ngOnInit(): void {
    this.conversationService.loadMyConversations();

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  ngOnDestroy(): void {
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
          const conversationId = parseInt(res.data);
          if (!isNaN(conversationId)) {
            this.selectConversation(conversationId);
          }
        }
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  selectConversation(id: number) {
    this.conversationService.loadInitialHistory(id).subscribe(() => {
      this.shouldScrollToBottom = true;
    });
  }

  onScroll(event: any) {
    const element = event.target;
    if (
      element.scrollTop === 0 &&
      !this.conversationService.isLoadingHistory() &&
      this.conversationService.hasMoreMessages()
    ) {
      const messages = this.conversationService.messages();
      if (messages.length > 0) {
        const oldestMessageId = messages[0].id;
        const oldScrollHeight = element.scrollHeight;
        const conversationId = this.conversationService.activeConversationId();

        if (conversationId) {
          this.conversationService
            .loadOlderMessages(conversationId, oldestMessageId)
            .subscribe(() => {
              setTimeout(() => {
                element.scrollTop = element.scrollHeight - oldScrollHeight;
              }, 0);
            });
        }
      }
    }
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  sendMessage(inputElement: HTMLInputElement) {
    const content = inputElement.value.trim();
    if (content) {
      console.log('Sending message:', content);
      inputElement.value = '';
    }
  }
}
