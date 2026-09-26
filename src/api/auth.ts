import { requestData } from '@/api/http'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'

/**
 * 使用账号密码登录并获取 JWT 会话。
 */
export function login(request: LoginRequest): Promise<AuthResponse> {
  return requestData<AuthResponse>({
    method: 'POST',
    url: '/auth/login',
    data: request,
  })
}

/**
 * 注册客户账号并直接获取 JWT 会话。
 */
export function register(request: RegisterRequest): Promise<AuthResponse> {
  return requestData<AuthResponse>({
    method: 'POST',
    url: '/auth/register',
    data: request,
  })
}
