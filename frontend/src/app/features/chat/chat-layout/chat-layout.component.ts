import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  ElementRef,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../core/services/conversation.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { Profile } from '../../../core/models/profile.model';
import { Attachment, Conversation } from '../../../core/models/conversation.model';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-layout.component.html',
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private isNearBottom: boolean = true;

  constructor() {
    effect(() => {
      const msgs = this.conversationService.messages();
      if (this.isNearBottom && msgs.length > 0) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      }
    });
  }

  getFileUrl(url: string) {
    if (!environment.production) {
      return `${environment.baseUrl}/${url}`;
    }

    return url;
  }

  getConversationAvatar(conv: any) {
    if (conv?.pictureUrl) {
      return this.getFileUrl(conv.pictureUrl);
    }
    return this.userService.defaultAvatar;
  }

  getUserAvatar(user: Profile | null) {
    if (user?.profilePictureUrl) {
      return this.getFileUrl(user.profilePictureUrl);
    }
    return this.userService.defaultAvatar;
  }

  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);
  protected chatService = inject(ChatService);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private typingSubject = new Subject<void>();
  private lastTypingEventSentAt = 0;

  searchQuery = signal('');
  searchResults = signal<Profile[]>([]);
  pendingAttachments = signal<Attachment[]>([]);
  isUploading = signal(false);
  showGroupInfo = signal(false);
  activeConversation = signal<Conversation | null>(null);
  memberSearchQuery = signal('');
  memberSearchResults = signal<Profile[]>([]);

  isAdmin = computed(() => {
    const me = this.userService.profile();
    const conv = this.activeConversation();
    if (!me || !conv || !conv.members) return false;
    return conv.members.find((m) => m.userId === me.id)?.isAdmin || false;
  });

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

    this.typingSubject.pipe(debounceTime(3000), takeUntil(this.destroy$)).subscribe(() => {
      const activeConversationId = this.conversationService.activeConversationId();
      if (activeConversationId) {
        this.chatService.notifyStoppedTyping(activeConversationId);
        this.lastTypingEventSentAt = 0;
      }
    });
  }

  ngOnDestroy(): void {
    const currentId = this.conversationService.activeConversationId();
    if (currentId) {
      this.chatService.leaveRoom(currentId);
    }
    this.chatService.clearTypingUsers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActiveConversationDetails(id: string) {
    this.conversationService.getConversation(id).subscribe((res) => {
      if (res.success) {
        this.activeConversation.set(res.data);
      }
    });
  }

  onMemberSearch() {
    const query = this.memberSearchQuery().trim();
    if (query.length >= 2) {
      this.userService.searchUsers(query).subscribe((res) => {
        if (res.success) {
          // Filter out existing members
          const members = this.activeConversation()?.members || [];
          this.memberSearchResults.set(
            res.data.filter((u) => !members.find((m) => m.userId === u.id)),
          );
        }
      });
    } else {
      this.memberSearchResults.set([]);
    }
  }

  addMember(userId: string) {
    const convId = this.conversationService.activeConversationId();
    if (convId) {
      this.conversationService.addGroupMember(convId, userId).subscribe((res) => {
        if (res.success) {
          this.loadActiveConversationDetails(convId);
          this.memberSearchQuery.set('');
          this.memberSearchResults.set([]);
        }
      });
    }
  }

  removeMember(userId: string) {
    const convId = this.conversationService.activeConversationId();
    if (convId) {
      this.conversationService.removeGroupMember(convId, userId).subscribe((res) => {
        if (res.success) {
          this.loadActiveConversationDetails(convId);
        }
      });
    }
  }

  leaveGroup() {
    const convId = this.conversationService.activeConversationId();
    if (convId) {
      this.conversationService.leaveGroup(convId).subscribe((res) => {
        if (res.success) {
          this.conversationService.activeConversationId.set(null);
          this.activeConversation.set(null);
          this.showGroupInfo.set(false);
          this.conversationService.loadMyConversations();
        }
      });
    }
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery());
  }

  onScroll(event: any) {
    const element = event.target as HTMLElement;

    // Detect if user is near bottom (50px tolerance)
    this.isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 50;

    // Pagination logic (load older messages)
    if (element.scrollTop === 0) {
      const activeId = this.conversationService.activeConversationId();
      const messages = this.conversationService.messages();

      if (
        activeId &&
        messages.length > 0 &&
        !this.conversationService.isLoadingHistory() &&
        this.conversationService.hasMoreMessages()
      ) {
        const prevScrollHeight = element.scrollHeight;
        const firstMessageId = messages[0].id;

        this.conversationService.loadOlderMessages(activeId, firstMessageId).subscribe(() => {
          // Maintain scroll position after prepending messages
          setTimeout(() => {
            element.scrollTop = element.scrollHeight - prevScrollHeight;
          }, 0);
        });
      }
    }
  }

  onInput() {
    const activeConversationId = this.conversationService.activeConversationId();
    if (!activeConversationId) return;

    const now = Date.now();
    // Throttling: only send UserTyping once every 5 seconds while user is typing
    if (now - this.lastTypingEventSentAt > 5000) {
      this.chatService.notifyTyping(activeConversationId);
      this.lastTypingEventSentAt = now;
    }

    this.typingSubject.next();
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    this.isUploading.set(true);
    this.conversationService.uploadAttachments(Array.from(files)).subscribe({
      next: (res) => {
        if (res.success) {
          this.pendingAttachments.update((current) => [...current, ...res.data]);
        }
        this.isUploading.set(false);
        event.target.value = ''; // Reset input
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.isUploading.set(false);
      },
    });
  }

  removeAttachment(index: number) {
    this.pendingAttachments.update((current) => current.filter((_, i) => i !== index));
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

    this.chatService.clearTypingUsers();
    this.showGroupInfo.set(false);
    this.conversationService.loadMyConversations();
    this.conversationService.loadInitialHistory(id).subscribe(() => {
      this.chatService.joinRoom(id);
      this.isNearBottom = true;
      this.scrollToBottom();
      this.loadActiveConversationDetails(id);
    });
  }

  private scrollToBottom() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  sendMessage(inputElement: HTMLInputElement) {
    const content = inputElement.value.trim();
    const conversationId = this.conversationService.activeConversationId();
    const attachments = this.pendingAttachments();

    if ((content || attachments.length > 0) && conversationId) {
      this.isNearBottom = true;
      this.chatService
        .sendMessage(conversationId, content, attachments)
        .then((message) => {
          if (message) {
            this.conversationService.pushMessage(message);
          }
          inputElement.value = '';
          this.pendingAttachments.set([]);
          this.chatService.notifyStoppedTyping(conversationId);
          this.lastTypingEventSentAt = 0;
        })
        .catch((err) => console.error('Failed to send message', err));
    }
  }
}
