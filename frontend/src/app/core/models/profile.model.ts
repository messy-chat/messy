export interface Profile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  status?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  status?: string;
}
