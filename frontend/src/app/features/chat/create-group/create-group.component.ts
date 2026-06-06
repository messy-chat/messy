import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConversationService } from '../../../core/services/conversation.service';
import { UserService } from '../../../core/services/user.service';
import { Profile } from '../../../core/models/profile.model';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-group.component.html',
})
export class CreateGroupComponent {
  private fb = inject(FormBuilder);
  private conversationService = inject(ConversationService);
  private userService = inject(UserService);
  private router = inject(Router);

  groupForm: FormGroup;
  searchQuery = signal('');
  searchResults = signal<Profile[]>([]);
  selectedUsers = signal<Profile[]>([]);
  private searchSubject = new Subject<string>();

  constructor() {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((query) => {
      this.performSearch(query);
    });
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  private performSearch(query: string) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= 3) {
      this.userService.searchUsers(trimmedQuery).subscribe({
        next: (res) => {
          if (res.success) {
            this.searchResults.set(res.data);
          }
        },
      });
    } else {
      this.searchResults.set([]);
    }
  }

  toggleUser(user: Profile) {
    this.selectedUsers.update((current) => {
      const exists = current.find((u) => u.id === user.id);
      if (exists) {
        return current.filter((u) => u.id !== user.id);
      } else {
        return [...current, user];
      }
    });
  }

  isUserSelected(userId: string): boolean {
    return !!this.selectedUsers().find((u) => u.id === userId);
  }

  onSubmit() {
    if (this.groupForm.valid && this.selectedUsers().length > 0) {
      const dto = {
        name: this.groupForm.value.name,
        memberUserIds: this.selectedUsers().map((u) => u.id),
      };

      this.conversationService.createGroup(dto).subscribe({
        next: (res) => {
          if (res.success) {
            const newId = res.data;
            this.conversationService.loadMyConversations();
            this.router.navigate(['/chat']).then(() => {
                this.conversationService.loadInitialHistory(newId).subscribe();
            });
          }
        },
      });
    }
  }

  cancel() {
    this.router.navigate(['/chat']);
  }
}
