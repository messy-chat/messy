import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ChatLayoutComponent } from './features/chat/chat-layout/chat-layout.component';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '' , redirectTo: 'chat', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'chat',
    component: ChatLayoutComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'chat' }
];
