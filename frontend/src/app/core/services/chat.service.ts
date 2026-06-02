import { Injectable, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  onlineUsers = signal<string[]>([]);
  private hubConnection: HubConnection | undefined;

  createHubConnection() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(environment.apiUrl.replace('/api', '') + '/hubs/chat', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((error) => console.log(error));

    this.hubConnection.on('GetOnlineUsers', (users: string[]) => {
      this.onlineUsers.set(users);
    });

    this.hubConnection.on('UserIsOnline', (username: string) => {
      this.onlineUsers.update((users) => [...users, username]);
    });

    this.hubConnection.on('UserIsOffline', (username: string) => {
      this.onlineUsers.update((users) => users.filter((x) => x !== username));
    });
  }

  stopHubConnection() {
    this.hubConnection?.stop().catch((error) => console.log(error));
    this.onlineUsers.set([]);
  }
}
