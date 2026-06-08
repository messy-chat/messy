import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';
import { UserService } from './core/services/user.service';
import { NavbarComponent } from './core/layout/navbar/navbar.component';

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
  private userService = inject(UserService);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.userService.getProfile().subscribe();
      this.chatService.createHubConnection();
    }
  }
}
