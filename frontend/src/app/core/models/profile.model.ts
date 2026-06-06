export interface Profile {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  profilePictureUrl?: string;
  bio?: string;
  status?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  status?: string;
}
