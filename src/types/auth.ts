export type UserRole = 'CUSTOMER' | 'SUPPORT' | 'ADMIN'

export interface UserInfo {
  id: number
  username: string
  displayName: string
  role: UserRole
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresAt: string
  user: UserInfo
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest extends LoginRequest {
  displayName: string
}
