import { inject, Injectable, signal, NgZone } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { Attachment, MessageDto } from '../models/conversation.model';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private ngZone = inject(NgZone);
  onlineUsers = signal<string[]>([]);
  private hubConnection: HubConnection | undefined;
  private messageReceivedSource = new Subject<MessageDto>();
  messageReceived$ = this.messageReceivedSource.asObservable();
  private hubReadyPromise: Promise<void> | undefined;

  createHubConnection() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(environment.apiUrl.replace('/api', '') + '/hubs/chat', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubReadyPromise = this.hubConnection
      .start()
      .then(() => console.log('SignalR Hub connected'))
      .catch((error) => {
        console.error('SignalR Hub connection error:', error);
      });

    this.hubConnection.on('GetOnlineUsers', (users: string[]) => {
      this.ngZone.run(() => {
        this.onlineUsers.set(users);
      });
    });

    this.hubConnection.on('UserIsOnline', (username: string) => {
      this.ngZone.run(() => {
        this.onlineUsers.update((users) => [...users, username]);
      });
    });

    this.hubConnection.on('UserIsOffline', (username: string) => {
      this.ngZone.run(() => {
        this.onlineUsers.update((users) => users.filter((x) => x !== username));
      });
    });

    this.hubConnection.on('NewMessage', (message: MessageDto) => {
      console.log('SignalR: NewMessage received', message);
      this.ngZone.run(() => {
        this.messageReceivedSource.next(message);
      });
    });
  }

  stopHubConnection() {
    this.hubConnection?.stop().catch((error) => console.log(error));
    this.onlineUsers.set([]);
    this.hubReadyPromise = undefined;
  }

  async joinRoom(conversationId: string) {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      console.log('SignalR: Joining room', conversationId);
      await this.hubConnection?.invoke('JoinConversation', conversationId);
    }
  }

  async leaveRoom(conversationId: string) {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      console.log('SignalR: Leaving room', conversationId);
      await this.hubConnection?.invoke('LeaveConversation', conversationId);
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    attachments?: Attachment[],
  ): Promise<MessageDto> {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      console.log('SignalR: Sending message to', conversationId);
      const message = await this.hubConnection?.invoke<MessageDto>(
        'SendMessage',
        conversationId,
        content,
        attachments,
      );
      return this.ngZone.run(() => message!);
    }
    return Promise.reject('Hub connection not established');
  }
}
