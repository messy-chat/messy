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
  template: './message-input.component.html',
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
    this.typingSubject.pipe(debounceTime(3000), takeUntilDestroyed()).subscribe(() => {
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

    const maxSize = 10 * 1024 * 1024; // 10 MB
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        alert(`File ${files[i].name} exceeds the maximum size of 10 MB.`);
      } else {
        validFiles.push(files[i]);
      }
    }

    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    this.isUploading.set(true);
    this.conversationService.uploadAttachments(Array.from(files)).subscribe({
      next: (res) => {
        if (res.success) this.pendingAttachments.update((current) => [...current, ...res.data]);
        this.isUploading.set(false);
        event.target.value = '';
      },
      error: () => {
        this.isUploading.set(false);
        event.target.value = '';
      },
    });
  }

  removeAttachment(index: number) {
    this.pendingAttachments.update((current) => current.filter((_, i) => i !== index));
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
