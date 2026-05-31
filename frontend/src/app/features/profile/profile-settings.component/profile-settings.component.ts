import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.css',
})
export class ProfileSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  profileService = inject(ProfileService);

  profileForm = this.fb.nonNullable.group({
    displayName: [''],
    bio: [''],
    status: [''],
  });

  isLoading = signal(false);
  isUploading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  backendUrl = environment.baseUrl;

  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.profileService.defaultAvatar;
  }

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.success) {
          this.profileForm.patchValue({
            displayName: res.data.displayName || '',
            bio: res.data.bio || '',
            status: res.data.status || '',
          });
        }
      },
      error: () => this.errorMessage.set('Nie udało się pobrać profilu.'),
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      this.profileService.uploadAvatar(file).subscribe({
        next: () => {
          this.isUploading.set(false);
          this.successMessage.set('Zdjęcie zaktualizowane!');
        },
        error: (err) => {
          this.isUploading.set(false);
          this.errorMessage.set(err.error?.message || 'Nie udało się zaktualizować zdjęcia.');
        },
      });
    }
  }

  onSubmit() {
    this.isLoading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const updateData = this.profileForm.getRawValue();

    this.profileService.updateProfile(updateData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Profil zaktualizowany!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Nie udało się zaktualizować profilu.');
      },
    });
  }
}
