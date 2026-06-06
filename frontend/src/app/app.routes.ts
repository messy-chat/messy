import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ChatLayoutComponent } from './features/chat/chat-layout/chat-layout.component';
import { authGuard } from './core/guards/auth-guard';
import { ProfileSettingsComponent } from './features/profile/profile-settings.component/profile-settings.component';
import { CreateGroupComponent } from './features/chat/create-group/create-group.component';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'chat',
    component: ChatLayoutComponent,
    canActivate: [authGuard],
  },
  {
    path: 'create-group',
    component: CreateGroupComponent,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: ProfileSettingsComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'chat' },
];
