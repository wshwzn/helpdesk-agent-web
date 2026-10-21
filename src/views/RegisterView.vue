<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import type { RegisterRequest } from '@/types/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive<RegisterRequest>({ username: '', password: '', displayName: '' })
const rules: FormRules<RegisterRequest> = {
  username: [
    { required: true, message: '请输入登录名', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{4,32}$/, message: '请输入 4 至 32 位字母、数字或下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 8, max: 72, message: '密码长度应为 8 至 72 位', trigger: 'blur' },
  ],
  displayName: [{ required: true, message: '请输入你的称呼', trigger: 'blur' }],
}

/**
 * 校验并注册客户账号，成功后直接进入聊天页面。
 */
async function submitRegister(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) {
    return
  }
  submitting.value = true
  try {
    await authStore.register(form)
    ElMessage.success('注册成功')
    await router.replace('/chat')
  } catch (error) {
    ElMessage.error(normalizeApiError(error).message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-hero auth-hero--register">
      <div class="auth-hero__content">
        <BrandMark />
        <p class="section-kicker section-kicker--light">知序 · KNOWLEDGE WORKSPACE</p>
        <h1>把工作里的疑问，<br />交给有依据的回答。</h1>
        <p>从一个具体问题开始。在企业资料中查找规则，查看来源，保留自己的问答记录。</p>
        <div class="auth-hero__feature"><span>01</span>资料不足时，明确说明边界</div>
        <div class="auth-hero__feature"><span>02</span>条件不完整时，先向你确认</div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <p class="section-kicker">创建账号</p>
        <h2>创建你的知识工作区</h2>
        <p class="auth-card__subtitle">注册员工账号，开始查找工作所需的知识。</p>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submitRegister">
          <el-form-item label="你的称呼" prop="displayName">
            <el-input v-model="form.displayName" size="large" autocomplete="name" placeholder="例如：小王" />
          </el-form-item>
          <el-form-item label="登录名" prop="username">
            <el-input v-model="form.username" size="large" autocomplete="username" placeholder="4 至 32 位字母、数字或下划线" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              autocomplete="new-password"
              placeholder="至少 8 位"
              show-password
              @keyup.enter="submitRegister"
            />
          </el-form-item>
          <el-button class="auth-submit" type="primary" size="large" native-type="submit" :loading="submitting">
            注册并进入
          </el-button>
        </el-form>

        <p class="auth-switch">已经有账号？<RouterLink to="/login">返回登录</RouterLink></p>
      </div>
    </section>
  </main>
</template>
