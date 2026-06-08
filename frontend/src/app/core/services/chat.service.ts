import { inject, Injectable, signal, NgZone } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import {
  Attachment,
  Conversation,
  ConversationUpdatedEvent,
  MemberAddedEvent,
  MemberRemovedEvent,
  MessageDto,
} from '../models/conversation.model';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private ngZone = inject(NgZone);
  onlineUsers = signal<string[]>([]);
  typingUsers = signal<{ userId: string; displayName: string }[]>([]);
  private hubConnection: HubConnection | undefined;
  private messageReceivedSource = new Subject<MessageDto>();
  messageReceived$ = this.messageReceivedSource.asObservable();

  private conversationCreatedSource = new Subject<Conversation>();
  conversationCreated$ = this.conversationCreatedSource.asObservable();

  private conversationUpdatedSource = new Subject<ConversationUpdatedEvent>();
  conversationUpdated$ = this.conversationUpdatedSource.asObservable();

  private memberAddedSource = new Subject<MemberAddedEvent>();
  memberAdded$ = this.memberAddedSource.asObservable();

  private memberRemovedSource = new Subject<MemberRemovedEvent>();
  memberRemoved$ = this.memberRemovedSource.asObservable();

  private hubReadyPromise: Promise<void> | undefined;

  createHubConnection() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(environment.apiUrl.replace('/api', '') + '/hubs/chat', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
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

    this.hubConnection.on('ConversationCreated', (conversation: Conversation) => {
      this.ngZone.run(() => this.conversationCreatedSource.next(conversation));
    });

    this.hubConnection.on('ConversationUpdated', (data: ConversationUpdatedEvent) => {
      this.ngZone.run(() => this.conversationUpdatedSource.next(data));
    });

    this.hubConnection.on('MemberAdded', (data: MemberAddedEvent) => {
      this.ngZone.run(() => this.memberAddedSource.next(data));
    });

    this.hubConnection.on('MemberRemoved', (data: MemberRemovedEvent) => {
      this.ngZone.run(() => this.memberRemovedSource.next(data));
    });

    this.hubConnection.on('OnUserTyping', (data: { userId: string; userName: string }) => {
      this.ngZone.run(() => {
        this.typingUsers.update((users) => {
          if (users.find((x) => x.userId === data.userId)) return users;
          return [...users, { userId: data.userId, displayName: data.userName }];
        });
      });
    });

    this.hubConnection.on('OnUserStoppedTyping', (data: { userId: string }) => {
      this.ngZone.run(() => {
        this.typingUsers.update((users) => users.filter((x) => x.userId !== data.userId));
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
  ): Promise<void> {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      console.log('SignalR: Sending message to', conversationId);
      await this.hubConnection?.invoke(
        'SendMessage',
        conversationId,
        content,
        attachments,
      );
      return;
    }
    return Promise.reject('Hub connection not established');
  }

  async notifyTyping(conversationId: string) {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      await this.hubConnection?.invoke('UserTyping', conversationId);
    }
  }

  async notifyStoppedTyping(conversationId: string) {
    if (this.hubReadyPromise) {
      await this.hubReadyPromise;
      await this.hubConnection?.invoke('UserStoppedTyping', conversationId);
    }
  }

  clearTypingUsers() {
    this.typingUsers.set([]);
  }
}
