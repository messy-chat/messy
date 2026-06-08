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
  templateUrl: 'message-list.component.html',
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
