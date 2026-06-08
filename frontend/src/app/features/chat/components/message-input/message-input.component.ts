import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConversationService } from '../../../../core/services/conversation.service';
import { ChatService } from '../../../../core/services/chat.service';
import { Attachment } from '../../../../core/models/conversation.model';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 border-t border-base-300 bg-base-200">
      @if (chatService.typingUsers().length > 0) {
        <div class="text-xs text-base-content/60 italic p-2">
          @for (user of chatService.typingUsers(); track user.userId) {
            <span>{{ user.displayName }} </span>
          }
          typing <span class="loading loading-dots loading-xs"></span>
        </div>
      }
      @if (pendingAttachments().length > 0) {
        <div class="flex flex-wrap gap-2 mb-2 p-2 bg-base-100 rounded-lg border border-base-300">
          @for (file of pendingAttachments(); track $index) {
            <div class="badge badge-secondary gap-2 p-3">
              <span class="text-xs truncate max-w-[150px]">{{ file.fileName }}</span>
              <svg (click)="removeAttachment($index)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current cursor-pointer">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          }
        </div>
      }

      <form (submit)="sendMessage(); $event.preventDefault()" class="flex gap-2">
        <input #fileInput type="file" class="hidden" multiple (change)="onFileSelected($event)" />
        <button type="button" class="btn btn-circle btn-ghost" (click)="fileInput.click()" [disabled]="isUploading()">
          @if (isUploading()) { <span class="loading loading-spinner loading-xs"></span> }
          @else {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          }
        </button>

        <input
          [(ngModel)]="messageContent"
          (input)="onInput()"
          name="content"
          type="text"
          placeholder="Type your message..."
          class="input input-bordered flex-1 focus:input-primary"
          autocomplete="off"
        />
        <button type="submit" class="btn btn-primary" [disabled]="!messageContent.trim() && pendingAttachments().length === 0">
          Send
        </button>
      </form>
    </div>
  `,
})
export class MessageInputComponent {
  protected conversationService = inject(ConversationService);
  protected chatService = inject(ChatService);

  messageContent = '';
  pendingAttachments = signal<Attachment[]>([]);
  isUploading = signal(false);

  private typingSubject = new Subject<void>();
  private lastTypingEventSentAt = 0;

  constructor() {
    this.typingSubject
      .pipe(debounceTime(3000), takeUntilDestroyed())
      .subscribe(() => {
        const activeId = this.conversationService.activeConversationId();
        if (activeId) {
          this.chatService.notifyStoppedTyping(activeId);
          this.lastTypingEventSentAt = 0;
        }
      });
  }

  onInput() {
    const activeId = this.conversationService.activeConversationId();
    if (!activeId) return;

    const now = Date.now();
    if (now - this.lastTypingEventSentAt > 5000) {
      this.chatService.notifyTyping(activeId);
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
        if (res.success) this.pendingAttachments.update(current => [...current, ...res.data]);
        this.isUploading.set(false);
        event.target.value = '';
      },
      error: () => this.isUploading.set(false),
    });
  }

  removeAttachment(index: number) {
    this.pendingAttachments.update(current => current.filter((_, i) => i !== index));
  }

  sendMessage() {
    const content = this.messageContent.trim();
    const activeId = this.conversationService.activeConversationId();
    const attachments = this.pendingAttachments();

    if ((content || attachments.length > 0) && activeId) {
      this.chatService.sendMessage(activeId, content, attachments).then(() => {
        this.messageContent = '';
        this.pendingAttachments.set([]);
        this.chatService.notifyStoppedTyping(activeId);
        this.lastTypingEventSentAt = 0;
      });
    }
  }
}
