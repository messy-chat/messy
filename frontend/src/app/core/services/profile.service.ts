import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/response.model';
import { Profile, UpdateProfileRequest } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/profile`;

  profile = signal<Profile | null>(null);

  getProfile(): Observable<ApiResponse<Profile>> {
    return this.http.get<ApiResponse<Profile>>(this.apiUrl).pipe(
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
          this.profile.update((current) => (current ? { ...current, profilePictureUrl: res.data } : null));
        }
      }),
    );
  }

  clearProfile() {
    this.profile.set(null);
  }
}
