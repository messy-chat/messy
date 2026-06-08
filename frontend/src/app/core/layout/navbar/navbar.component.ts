import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ChatService } from '../../services/chat.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  authService = inject(AuthService);
  userService = inject(UserService);
  chatService = inject(ChatService);
  backendUrl = environment.baseUrl;

  logout() {
    this.chatService.stopHubConnection();
    this.authService.logout();
    this.userService.clearProfile();
  }

  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.userService.defaultAvatar;
  }
}
