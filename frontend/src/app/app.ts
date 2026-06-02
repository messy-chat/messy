import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';
import { ProfileService } from './core/services/profile.service';
import { NavbarComponent } from './core/layout/navbar.component/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private profileService = inject(ProfileService);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.profileService.getProfile().subscribe();
      this.chatService.createHubConnection();
    }
  }
}
