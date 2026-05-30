export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password?: string;
}

export interface AuthResponse {
  username: string;
  token: string;
}

export interface RegisterResponse {
  message: string;
}
