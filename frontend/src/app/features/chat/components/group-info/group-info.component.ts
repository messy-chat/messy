import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationService } from '../../../../core/services/conversation.service';
import { UserService } from '../../../../core/services/user.service';
import { Profile } from '../../../../core/models/profile.model';
import { environment } from '../../../../../environments/environment';
import { ChatService } from '../../../../core/services/chat.service';

@Component({
  selector: 'app-group-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: `./group-info.component.html`,
})
export class GroupInfoComponent {
  protected conversationService = inject(ConversationService);
  protected userService = inject(UserService);
  protected chatService = inject(ChatService);

  @Output() close = new EventEmitter<void>();

  memberSearchQuery = '';
  memberSearchResults = signal<Profile[]>([]);

  isEditingName = signal(false);
  newGroupName = '';

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
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      alert(`The photo exceeds the maximum size of 10 MB.`);
      event.target.value = '';
      return;
    }
    const convId = this.conversationService.activeConversationId();
    if (convId) {
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

  startEditingName() {
    const currentName = this.conversationService.activeConversation()?.name;
    if (currentName) {
      this.newGroupName = currentName;
      this.isEditingName.set(true);
    }
  }

  saveGroupName() {
    const convId = this.conversationService.activeConversationId();
    const trimmedName = this.newGroupName.trim();

    if (
      convId &&
      trimmedName &&
      trimmedName !== this.conversationService.activeConversation()?.name
    ) {
      this.conversationService.updateConversationName(convId, trimmedName).subscribe({
        next: () => {
          this.isEditingName.set(false);
        },
        error: () => {
          alert('Nie udało się zmienić nazwy grupy.');
          this.isEditingName.set(false);
        },
      });
    } else {
      this.isEditingName.set(false); // Anuluj edycję, jeśli nazwa jest taka sama lub pusta
    }
  }
}
