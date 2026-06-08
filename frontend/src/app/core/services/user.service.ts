import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/response.model';
import { Profile, UpdateProfileRequest } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/user`;
  private backendUrl = environment.baseUrl;

  profile = signal<Profile | null>(null);

  readonly defaultAvatar = 'https://api.dicebear.com/7.x/notionists/svg?seed=Messenger';

  avatarUrl = computed(() => {
    const profile = this.profile();
    if (!profile?.avatarUrl) return this.defaultAvatar;
    return `${this.backendUrl}${profile.avatarUrl}`;
  });

  getProfile(): Observable<ApiResponse<Profile>> {
    return this.http.get<ApiResponse<Profile>>(`${this.apiUrl}/me`).pipe(
      tap((res) => {
        if (res.success) {
          this.profile.set(res.data);
        }
      }),
    );
  }

  updateProfile(data: UpdateProfileRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/update`, data).pipe(
      tap((res) => {
        if (res.success) {
          this.profile.update((current) => (current ? { ...current, ...data } : null));
        }
      }),
    );
  }

  uploadAvatar(file: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/photo`, formData).pipe(
      tap((res) => {
        if (res.success) {
          this.profile.update((current) =>
            current ? { ...current, avatarUrl: res.data } : null,
          );
        }
      }),
    );
  }

  searchUsers(query: string): Observable<ApiResponse<Profile[]>> {
    return this.http.get<ApiResponse<Profile[]>>(`${this.apiUrl}/search?query=${query}`);
  }

  clearProfile() {
    this.profile.set(null);
  }
}
