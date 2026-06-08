import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConversationService } from '../../../../core/services/conversation.service';
import { UserService } from '../../../../core/services/user.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';
import { ChatService } from '../../../../core/services/chat.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);
  protected chatService = inject(ChatService);
  searchQuery = signal('');
  searchResults = signal<Profile[]>([]);
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.performSearch(query));
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  private performSearch(query: string) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= 3) {
      this.userService.searchUsers(trimmedQuery).subscribe((res) => {
        if (res.success) this.searchResults.set(res.data);
        console.log(res);
      });
    } else {
      this.searchResults.set([]);
    }
  }

  startChat(username: string) {
    this.conversationService.createPrivateConversation(username).subscribe((res) => {
      if (res.success && res.data) {
        this.selectConversation(res.data);
        this.searchQuery.set('');
        this.searchResults.set([]);
      }
    });
  }

  selectConversation(id: string) {
    this.conversationService.activeConversationId.set(id);
  }

  getUserAvatar(user: Profile | null) {
    if (user?.avatarUrl) {
      return `${environment.baseUrl}/${user.avatarUrl}`;
    }
    return this.userService.defaultAvatar;
  }

  getConversationAvatar(conv: any) {
    if (conv?.imageUrl) {
      return `${environment.baseUrl}/${conv.imageUrl}`;
    }
    return this.userService.defaultAvatar;
  }
}
