import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationService } from '../../../core/services/conversation.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-layout.component.html',
})
export class ChatLayoutComponent implements OnInit, AfterViewChecked {
  protected conversationService = inject(ConversationService);
  protected profileService = inject(ProfileService);
  protected chatService = inject(ChatService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.conversationService.loadMyConversations();
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
