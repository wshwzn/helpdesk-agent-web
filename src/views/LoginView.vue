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
const form = reactive<LoginRequest>({ username: '', password: '' })
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
        <p class="section-kicker section-kicker--light">知序 · KNOWLEDGE WORKSPACE</p>
        <h1>每个答案，<br />都应有来处。</h1>
        <p>让散落在资料里的知识，为你所用。查找制度、比较规则，在原文中找到依据。</p>
        <div class="auth-hero__feature"><span>01</span>围绕企业资料，回答工作问题</div>
        <div class="auth-hero__feature"><span>02</span>保留引用与版本，方便回看核对</div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <p class="section-kicker">欢迎回来</p>
        <h2>进入知识工作区</h2>
        <p class="auth-card__subtitle">继续提问，让工作中的疑问有据可循。</p>

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

        <p class="auth-switch">还没有账号？<RouterLink to="/register">创建账号</RouterLink></p>
      </div>
    </section>
  </main>
</template>
