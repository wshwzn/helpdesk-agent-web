import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { login as loginApi, register as registerApi } from '@/api/auth'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'
import { clearAuthSession, readAuthSession, writeAuthSession } from '@/utils/auth-storage'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthResponse | null>(readAuthSession())
  const isAuthenticated = computed(() => Boolean(session.value?.accessToken))
  const user = computed(() => session.value?.user ?? null)

  /**
   * 登录客户账号，并同时更新内存状态和浏览器本地会话。
   */
  async function login(request: LoginRequest): Promise<void> {
    const response = await loginApi(request)
    saveSession(response)
  }

  /**
   * 注册客户账号，并使用后端返回的会话直接进入系统。
   */
  async function register(request: RegisterRequest): Promise<void> {
    const response = await registerApi(request)
    saveSession(response)
  }

  /**
   * 退出当前账号并删除浏览器中的 JWT 会话。
   */
  function logout(): void {
    session.value = null
    clearAuthSession()
  }

  /**
   * 保存最新认证会话，保证页面刷新后仍能恢复登录状态。
   */
  function saveSession(response: AuthResponse): void {
    session.value = response
    writeAuthSession(response)
  }

  return { session, isAuthenticated, user, login, register, logout }
})
