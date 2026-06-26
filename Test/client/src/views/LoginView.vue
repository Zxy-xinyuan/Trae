<template>
  <div class="login-page">
    <div class="login-bg-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <SafetyCertificateOutlined />
          </div>
          <h1 class="login-title">安全检查管理系统</h1>
          <p class="login-subtitle">Safety Inspection Management System</p>
        </div>
        <a-form :model="form" :rules="rules" @finish="handleLogin" layout="vertical" size="large">
          <a-form-item name="username">
            <a-input
              v-model:value="form.username"
              placeholder="请输入用户名"
              autocomplete="off"
              class="login-input"
            >
              <template #prefix><UserOutlined /></template>
            </a-input>
          </a-form-item>
          <a-form-item name="password">
            <a-input-password
              v-model:value="form.password"
              placeholder="请输入密码"
              class="login-input"
            >
              <template #prefix><LockOutlined /></template>
            </a-input-password>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="loading" block class="login-btn">
              登 录
            </a-button>
          </a-form-item>
        </a-form>
        <div class="login-hints">
          <a-collapse :bordered="false" ghost expand-icon-position="end">
            <a-collapse-panel key="1" header="预置测试账号">
              <div class="test-accounts">
                <div class="test-row"><span class="test-label">管理员</span><code>admin / admin123</code></div>
                <div class="test-row"><span class="test-label">负责人</span><code>manager1 / 123456</code></div>
                <div class="test-row"><span class="test-label">检查人</span><code>inspector1 / 123456</code></div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
      <div class="login-footer">
        <span>© 2026 安全检查管理系统</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SafetyCertificateOutlined, UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }]
}

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(form)
    message.success('登录成功')
    const role = authStore.role
    if (role === 'admin') router.push('/dashboard')
    else if (role === 'manager') router.push('/profile')
    else router.push('/inspections')
  } catch {
    /* error handled by interceptor */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(155deg, #0F172A 0%, #1E3A5F 30%, #2C6E9E 70%, #3B82F6 100%);
  position: relative;
  overflow: hidden;
}
.login-bg-shapes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
}
.shape-1 {
  width: 600px;
  height: 600px;
  background: #fff;
  top: -200px;
  right: -100px;
}
.shape-2 {
  width: 400px;
  height: 400px;
  background: #fff;
  bottom: -150px;
  left: -80px;
}
.shape-3 {
  width: 200px;
  height: 200px;
  background: #fff;
  top: 50%;
  left: 60%;
}

.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
}
.login-card {
  width: 400px;
  padding: var(--space-10);
  background: #fff;
  border-radius: var(--radius-2xl);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.28);
}
.login-header {
  text-align: center;
  margin-bottom: var(--space-8);
}
.login-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--space-4);
  background: linear-gradient(135deg, var(--primary-500), var(--primary-300));
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
}
.login-title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--gray-800);
  margin: 0 0 var(--space-1) 0;
}
.login-subtitle {
  font-size: var(--text-xs);
  color: var(--gray-400);
  margin: 0;
  font-weight: var(--weight-normal);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.login-input :deep(.ant-input),
.login-input :deep(.ant-input-affix-wrapper) {
  border-radius: var(--radius-md);
  height: 44px;
}
.login-btn {
  height: 46px !important;
  border-radius: var(--radius-md) !important;
  font-size: var(--text-base) !important;
  font-weight: var(--weight-semibold) !important;
  letter-spacing: 0.04em;
  background: var(--primary-500) !important;
  border-color: var(--primary-500) !important;
  margin-top: var(--space-2);
}
.login-btn:hover {
  background: var(--primary-600) !important;
}
.login-hints {
  margin-top: var(--space-4);
}
.test-accounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.test-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
.test-label {
  color: var(--gray-500);
  font-weight: var(--weight-medium);
  min-width: 48px;
}
.test-row code {
  font-family: var(--font-mono);
  background: var(--gray-50);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--gray-700);
  border: var(--border-card);
}
.login-footer {
  color: rgba(255,255,255,0.4);
  font-size: var(--text-xs);
}

@media (max-width: 767px) {
  .login-card {
    width: 92vw;
    padding: var(--space-6);
  }
}
</style>
