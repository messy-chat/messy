import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConversationService } from '../../../../core/services/conversation.service';
import { UserService } from '../../../../core/services/user.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="w-full h-full flex flex-col border-r border-base-300">
      <div class="p-4 border-b border-base-300 bg-base-200">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Conversations</h2>
          <button routerLink="/create-group" class="btn btn-primary btn-xs">+ Group</button>
        </div>
        <div class="relative">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search users..."
            class="input input-bordered input-sm w-full"
          />
          @if (searchResults().length > 0) {
            <div class="absolute z-10 w-full mt-1 bg-base-100 shadow-xl rounded-box max-h-60 overflow-y-auto border border-base-300">
              @for (user of searchResults(); track user.id) {
                <div class="p-2 hover:bg-base-200 flex items-center justify-between border-b border-base-200 last:border-0">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <div class="avatar">
                      <div class="rounded-full w-8">
                        <img [src]="getUserAvatar(user)" [alt]="user.displayName" />
                      </div>
                    </div>
                    <span class="text-sm font-medium truncate">{{ user.displayName }}</span>
                  </div>
                  <button (click)="startChat(user.username)" class="btn btn-primary btn-xs">Chat</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        @for (conv of conversationService.conversations(); track conv.id) {
          <div
            (click)="selectConversation(conv.id)"
            class="p-4 cursor-pointer hover:bg-base-200 border-b border-base-300 transition-colors"
            [ngClass]="{'bg-primary/10 border-l-4 border-l-primary': conversationService.activeConversationId() === conv.id}"
          >
            <div class="flex items-center gap-3">
              <div class="avatar flex-shrink-0">
                <div class="rounded-full w-10">
                  <img [src]="getConversationAvatar(conv)" [alt]="conv.name" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold truncate">{{ conv.name }}</h3>
                  @if (conv.lastMessageSentAt) {
                    <span class="text-xs opacity-50">{{ conv.lastMessageSentAt | date: 'shortTime' }}</span>
                  }
                </div>
                @if (conv.lastMessage) {
                  <p class="text-sm opacity-70 truncate">{{ conv.lastMessage }}</p>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="p-8 text-center opacity-50">No conversations found.</div>
        }
      </div>
    </div>
  `,
})
export class SidebarComponent {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);

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
        console.log(res)
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
