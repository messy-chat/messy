import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { MessageListComponent } from '../components/message-list/message-list.component';
import { MessageInputComponent } from '../components/message-input/message-input.component';
import { GroupInfoComponent } from '../components/group-info/group-info.component';
import { ConversationService } from '../../../core/services/conversation.service';
import { ChatService } from '../../../core/services/chat.service';
import { Subject, switchMap, takeUntil, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    MessageListComponent,
    MessageInputComponent,
    GroupInfoComponent,
  ],
  templateUrl: './chat-layout.component.html',
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  protected conversationService = inject(ConversationService);
  protected chatService = inject(ChatService);
  protected userService = inject(UserService);

  private destroy$ = new Subject<void>();
  showGroupInfo = signal(false);

  constructor() {
    // React to conversation selection changes
    effect(() => {
      const id = this.conversationService.activeConversationId();
      if (id) {
        this.onConversationSelected(id);
      }
    });
  }

  ngOnInit(): void {
    this.conversationService.loadMyConversations().pipe(takeUntil(this.destroy$)).subscribe();
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

  private onConversationSelected(id: string) {
    this.chatService.clearTypingUsers();
    this.showGroupInfo.set(false);

    of(id)
      .pipe(
        switchMap((convId) => this.conversationService.loadInitialHistory(convId)),
        switchMap(() => this.conversationService.loadConversationDetails(id)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.chatService.joinRoom(id);
      });
  }

  getOtherMemberInfo(): string | null {
    const conv = this.conversationService.activeConversation();
    const me = this.userService.profile()?.id;
    if (!conv || conv.isGroup || !me || !conv.members) return null;

    const other = conv.members.find(m => m.userId !== me);
    if (!other) return null;

    const status: string = `Status: ${other.status || (this.isOtherMemberOnline() ? 'Online' : 'Offline')}`;

    const bio: string = `${other.bio ? `| Bio: ${other.bio}` : ''}`;

    return  `${status} ${bio}`;
  }

  getConversationAvatar(conv: any) {
    if (conv?.imageUrl) {
      return `${environment.baseUrl}/${conv.imageUrl}`;
    }
    return 'https://api.dicebear.com/7.x/notionists/svg?seed=Messenger';
  }

  isOtherMemberOnline(): boolean {
    const conv = this.conversationService.activeConversation();
    const me = this.userService.profile()?.id;
    if (!conv || conv.isGroup || !me || !conv.members) return false;

    const otherId = conv.members.find((m) => m.userId !== me)?.userId;
    return otherId ? this.chatService.onlineUsers().includes(otherId) : false;
  }
}
