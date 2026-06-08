import { Component, inject, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../../core/services/conversation.service';
import { UserService } from '../../../../core/services/user.service';
import { ChatService } from '../../../../core/services/chat.service';
import { ScrollToBottomDirective } from '../../../../shared/directives/scroll-to-bottom.directive';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, ScrollToBottomDirective],
  template: `
    <div
      #scrollContainer
      class="flex-1 overflow-y-auto p-4 space-y-4"
      (scroll)="onScroll($event)"
      [appScrollToBottom]="isNearBottom"
    >
      @if (conversationService.isLoadingHistory() && conversationService.messages().length === 0) {
        <div class="flex justify-center p-4">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      }

      @for (msg of conversationService.messages(); track msg.id) {
        <div class="chat" [ngClass]="msg.senderId === userService.profile()?.id ? 'chat-end' : 'chat-start'">
          <div class="chat-header">
            {{ msg.senderName }}
            <time class="text-xs opacity-50 ml-1">{{ msg.sentAt | date: 'shortTime' }}</time>
          </div>
          <div
            class="chat-bubble"
            [ngClass]="msg.senderId === userService.profile()?.id ? 'chat-bubble-primary' : 'chat-bubble-secondary'"
          >
            {{ msg.content }}

            @if (msg.attachments && msg.attachments.length > 0) {
              <div class="flex flex-wrap gap-2 mt-2 mb-2">
                @for (file of msg.attachments; track file.url) {
                  <div class="attachment-item">
                    @switch (file.type) {
                      @case ('Image') {
                        <img [src]="getFileUrl(file.url)" [alt]="file.fileName" class="max-w-[250px] rounded-lg shadow-sm" />
                      }
                      @case ('Video') {
                        <video [src]="getFileUrl(file.url)" controls class="max-w-[300px] rounded-lg shadow-sm"></video>
                      }
                      @case ('Audio') {
                        <audio [src]="getFileUrl(file.url)" controls class="w-full max-w-[250px]"></audio>
                      }
                      @default {
                        <a [href]="getFileUrl(file.url)" target="_blank" [download]="file.fileName" class="btn btn-sm btn-outline gap-2 normal-case">
                          {{ file.fileName || 'Download' }}
                        </a>
                      }
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (conversationService.isLoadingHistory() && conversationService.messages().length > 0) {
        <div class="flex justify-center p-2">
          <span class="loading loading-spinner loading-sm text-primary"></span>
        </div>
      }
    </div>
  `,
})
export class MessageListComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);

  isNearBottom = true;

  onScroll(event: any) {
    const element = event.target as HTMLElement;
    this.isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 50;

    if (element.scrollTop === 0) {
      this.loadOlderMessages(element);
    }
  }

  private loadOlderMessages(element: HTMLElement) {
    const activeId = this.conversationService.activeConversationId();
    const messages = this.conversationService.messages();

    if (activeId && messages.length > 0 && !this.conversationService.isLoadingHistory() && this.conversationService.hasMoreMessages()) {
      const prevScrollHeight = element.scrollHeight;
      this.conversationService.loadOlderMessages(activeId, messages[0].id).subscribe(() => {
        setTimeout(() => {
          element.scrollTop = element.scrollHeight - prevScrollHeight;
        }, 0);
      });
    }
  }

  getFileUrl(url: string) {
    return `${environment.baseUrl}/${url}`;
  }
}
