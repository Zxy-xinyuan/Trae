<template>
  <div class="settings-view" style="max-width: 600px">
    <h3 class="page-title">系统设置</h3>

    <a-card title="修改密码" :bordered="false" style="margin-bottom: 16px">
      <a-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" layout="vertical" @finish="handleChangePwd">
        <a-form-item label="旧密码" name="old_password">
          <a-input-password v-model:value="pwdForm.old_password" placeholder="请输入旧密码" />
        </a-form-item>
        <a-form-item label="新密码" name="new_password">
          <a-input-password v-model:value="pwdForm.new_password" placeholder="请输入新密码（至少6位）" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirm_password">
          <a-input-password v-model:value="pwdForm.confirm_password" placeholder="请再次输入新密码" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="pwdLoading" html-type="submit" block>修改密码</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card v-if="auth.isAdmin" title="发布系统通知" :bordered="false">
      <a-form ref="notifyFormRef" :model="notifyForm" :rules="notifyRules" layout="vertical" @finish="handleNotify">
        <a-form-item label="通知标题" name="title">
          <a-input v-model:value="notifyForm.title" placeholder="通知标题" />
        </a-form-item>
        <a-form-item label="通知内容" name="content">
          <a-textarea v-model:value="notifyForm.content" :rows="4" placeholder="通知内容" />
        </a-form-item>
        <a-form-item label="发送对象">
          <a-radio-group v-model:value="notifyForm.target_role">
            <a-radio value="">所有人</a-radio>
            <a-radio value="admin">管理员</a-radio>
            <a-radio value="manager">工作室负责人</a-radio>
            <a-radio value="inspector">检查负责人</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="notifyLoading" html-type="submit" block>发布通知</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="用户信息" :bordered="false" style="margin-top: 16px">
      <a-descriptions :column="1" size="small">
        <a-descriptions-item label="用户名">{{ auth.user?.username }}</a-descriptions-item>
        <a-descriptions-item label="姓名">{{ auth.user?.real_name || '-' }}</a-descriptions-item>
        <a-descriptions-item label="角色">{{ roleLabel }}</a-descriptions-item>
        <a-descriptions-item label="所属工作室">{{ auth.user?.studio_name || '无' }}</a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { changePassword, publishNotify } from '../api/settings'
import { useAuthStore } from '../store/auth'
import { ROLE_MAP } from '../utils/constants'

const auth = useAuthStore()

const pwdFormRef = ref()
const notifyFormRef = ref()
const pwdLoading = ref(false)
const notifyLoading = ref(false)

const pwdForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const notifyForm = reactive({
  title: '',
  content: '',
  target_role: ''
})

const pwdRules = {
  old_password: [{ required: true, message: '请输入旧密码' }],
  new_password: [
    { required: true, message: '请输入新密码' },
    { min: 6, message: '密码至少6位' }
  ],
  confirm_password: [
    { required: true, message: '请确认新密码' },
    {
      validator: (_, val) => val === pwdForm.new_password ? Promise.resolve() : Promise.reject('两次密码不一致')
    }
  ]
}

const notifyRules = {
  title: [{ required: true, message: '请输入标题' }],
  content: [{ required: true, message: '请输入内容' }]
}

const roleLabel = computed(() => ROLE_MAP[auth.role]?.label || auth.role)

async function handleChangePwd() {
  pwdLoading.value = true
  try {
    await changePassword({
      old_password: pwdForm.old_password,
      new_password: pwdForm.new_password
    })
    message.success('密码修改成功')
    pwdForm.old_password = ''
    pwdForm.new_password = ''
    pwdForm.confirm_password = ''
  } catch { /* ignore */ } finally {
    pwdLoading.value = false
  }
}

async function handleNotify() {
  notifyLoading.value = true
  try {
    await publishNotify({
      title: notifyForm.title,
      content: notifyForm.content,
      target_role: notifyForm.target_role || undefined
    })
    message.success('通知已发布')
    notifyForm.title = ''
    notifyForm.content = ''
    notifyForm.target_role = ''
  } catch { /* ignore */ } finally {
    notifyLoading.value = false
  }
}
</script>

<style scoped>
.page-title { margin-bottom: 24px; }
</style>
