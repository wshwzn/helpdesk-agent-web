import type { AuthResponse } from '@/types/auth'

const AUTH_STORAGE_KEY = 'helpdesk-agent.auth'

/**
 * 从浏览器本地存储读取登录会话，数据损坏时自动清理。
 */
export function readAuthSession(): AuthResponse | null {
  const rawSession = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!rawSession) {
    return null
  }
  try {
    return JSON.parse(rawSession) as AuthResponse
  } catch {
    clearAuthSession()
    return null
  }
}

/**
 * 将后端返回的登录会话保存到浏览器本地存储。
 */
export function writeAuthSession(session: AuthResponse): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

/**
 * 清除本地登录会话。
 */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

/**
 * 获取当前会话中的 JWT，未登录时返回空值。
 */
export function readAccessToken(): string | null {
  return readAuthSession()?.accessToken ?? null
}
