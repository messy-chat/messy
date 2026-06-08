import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationService } from '../../../../core/services/conversation.service';
import { UserService } from '../../../../core/services/user.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-group-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-80 h-full border-l border-base-300 bg-base-200 overflow-y-auto p-4 flex flex-col gap-6">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-bold">Group Info</h3>
        <button (click)="close.emit()" class="btn btn-ghost btn-sm btn-circle">✕</button>
      </div>

      <div class="flex flex-col items-center gap-4">
        <div class="avatar">
          <div class="rounded-full w-24 ring ring-primary ring-offset-base-100 ring-offset-2">
            <img [src]="getConversationAvatar(conversationService.activeConversation())" />
          </div>
        </div>
        <h2 class="text-xl font-bold text-center">{{ conversationService.activeConversation()?.name }}</h2>

        @if (isAdmin()) {
          <input #groupImageInput type="file" class="hidden" accept="image/*" (change)="onGroupImageSelected($event)" />
          <button class="btn btn-primary btn-sm btn-outline" (click)="groupImageInput.click()">Change Photo</button>
        }
      </div>

      @if (isAdmin()) {
        <div class="flex flex-col gap-2">
          <h4 class="text-sm font-semibold opacity-70 uppercase tracking-wider">Add Member</h4>
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="memberSearchQuery"
              (input)="onMemberSearch()"
              placeholder="Search users..."
              class="input input-bordered input-sm w-full"
            />
            @if (memberSearchResults().length > 0) {
              <div class="absolute z-20 w-full mt-1 bg-base-100 shadow-xl rounded-box max-h-40 overflow-y-auto border border-base-300">
                @for (user of memberSearchResults(); track user.id) {
                  <div class="p-2 hover:bg-base-200 flex items-center justify-between border-b border-base-200 last:border-0">
                    <div class="flex items-center gap-2">
                      <div class="avatar">
                        <div class="rounded-full w-6">
                          <img [src]="getUserAvatar(user)" />
                        </div>
                      </div>
                      <span class="text-sm truncate max-w-[120px]">{{ user.displayName }}</span>
                    </div>
                    <button (click)="addMember(user.id)" class="btn btn-primary btn-xs">Add</button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <div class="flex flex-col gap-2">
        <h4 class="text-sm font-semibold opacity-70 uppercase tracking-wider">Members ({{ conversationService.activeConversation()?.members?.length }})</h4>
        <div class="flex flex-col gap-2">
          @for (member of conversationService.activeConversation()?.members; track member.userId) {
            <div class="flex items-center justify-between group">
              <div class="flex items-center gap-2 overflow-hidden">
                <div class="avatar">
                  <div class="rounded-full w-8">
                    <img [src]="getUserAvatarFromMember(member)" />
                  </div>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-medium truncate">{{ member.displayName }}</span>
                  @if (member.isAdmin) { <span class="text-[10px] text-primary font-bold uppercase">Admin</span> }
                </div>
              </div>
              @if (isAdmin() && member.userId !== userService.profile()?.id) {
                <button (click)="removeMember(member.userId)" class="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
              }
            </div>
          }
        </div>
      </div>

      <div class="mt-auto pt-4 border-t border-base-300">
        <button (click)="leaveGroup()" class="btn btn-outline btn-error btn-block btn-sm">Leave Group</button>
      </div>
    </div>
  `,
})
export class GroupInfoComponent {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);

  @Output() close = new EventEmitter<void>();
  
  memberSearchQuery = '';
  memberSearchResults = signal<Profile[]>([]);

  isAdmin = computed(() => {
    const me = this.userService.profile();
    const conv = this.conversationService.activeConversation();
    if (!me || !conv || !conv.members) return false;
    return conv.members.find((m) => m.userId === me.id)?.isAdmin || false;
  });

  onMemberSearch() {
    const query = this.memberSearchQuery.trim();
    if (query.length >= 2) {
      this.userService.searchUsers(query).subscribe((res) => {
        if (res.success) {
          const members = this.conversationService.activeConversation()?.members || [];
          this.memberSearchResults.set(res.data.filter((u) => !members.find((m) => m.userId === u.id)));
        }
      });
    } else {
      this.memberSearchResults.set([]);
    }
  }

  addMember(userId: string) {
    const convId = this.conversationService.activeConversationId();
    if (convId) {
      this.conversationService.addGroupMember(convId, userId).subscribe(() => {
        this.memberSearchQuery = '';
        this.memberSearchResults.set([]);
      });
    }
  }

  removeMember(userId: string) {
    const convId = this.conversationService.activeConversationId();
    if (convId) this.conversationService.removeGroupMember(convId, userId).subscribe();
  }

  leaveGroup() {
    const convId = this.conversationService.activeConversationId();
    if (convId) this.conversationService.leaveGroup(convId).subscribe(() => this.close.emit());
  }

  onGroupImageSelected(event: any) {
    const file: File = event.target.files[0];
    const convId = this.conversationService.activeConversationId();
    if (file && convId) {
      this.conversationService.uploadGroupImage(convId, file).subscribe();
    }
  }

  getUserAvatar(user: Profile | null) {
    if (user?.avatarUrl) return `${environment.baseUrl}/${user.avatarUrl}`;
    return this.userService.defaultAvatar;
  }

  getUserAvatarFromMember(member: any) {
    if (member?.avatarUrl) return `${environment.baseUrl}/${member.avatarUrl}`;
    return this.userService.defaultAvatar;
  }

  getConversationAvatar(conv: any) {
    if (conv?.imageUrl) return `${environment.baseUrl}/${conv.imageUrl}`;
    return this.userService.defaultAvatar;
  }
}
