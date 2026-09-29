<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  type FormInstance,
  type FormRules,
} from 'element-plus'

import { normalizeApiError } from '@/api/http'
import BrandMark from '@/components/BrandMark.vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginRequest } from '@/types/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive<LoginRequest>({ username: 'user', password: 'user123' })
const rules: FormRules<LoginRequest> = {
  username: [{ required: true, message: '请输入登录名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
}

/**
 * 校验登录表单并进入用户原本要访问的页面。
 */
async function submitLogin(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) {
    return
  }
  submitting.value = true
  try {
    await authStore.login(form)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat'
    await router.replace(redirect)
  } catch (error) {
    ElMessage.error(normalizeApiError(error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-hero">
      <div class="auth-hero__content">
        <BrandMark />
        <p class="section-kicker section-kicker--light">Helpdesk Agent</p>
        <h1>让每一次咨询<br />都有清晰的答案</h1>
        <p>AI 即时响应，复杂问题无缝转入人工工单。你的服务进度，始终清楚可见。</p>
        <div class="auth-hero__feature"><span>01</span>实时对话与上下文理解</div>
        <div class="auth-hero__feature"><span>02</span>问题记录与工单协同</div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <p class="section-kicker">欢迎回来</p>
        <h2>登录客户中心</h2>
        <p class="auth-card__subtitle">继续你的咨询，查看最新处理进度。</p>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submitLogin">
          <el-form-item label="登录名" prop="username">
            <el-input v-model="form.username" size="large" autocomplete="username" placeholder="请输入登录名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              show-password
              @keyup.enter="submitLogin"
            />
          </el-form-item>
          <el-button class="auth-submit" type="primary" size="large" native-type="submit" :loading="submitting">
            登录
          </el-button>
        </el-form>

        <p class="auth-switch">还没有账号？<RouterLink to="/register">免费注册</RouterLink></p>
      </div>
    </section>
  </main>
</template>
