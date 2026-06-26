<template>
  <div class="notification-view">
    <div class="page-header">
      <h3 class="page-title">通知消息</h3>
      <a-space>
        <a-button v-if="auth.isAdmin" type="primary" danger size="small" @click="handleRemind">
          <WarningOutlined /> 手动提醒未检查
        </a-button>
        <a-radio-group v-model:value="filterType" size="small" @change="fetchData">
          <a-radio-button value="">全部</a-radio-button>
          <a-radio-button value="0">未读</a-radio-button>
          <a-radio-button value="1">已读</a-radio-button>
        </a-radio-group>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-list
        :data-source="list"
        :pagination="pagination"
        item-layout="horizontal"
      >
        <template #renderItem="{ item }">
          <a-list-item :class="{ unread: !item.is_read }" @click="handleRead(item)">
            <a-list-item-meta>
              <template #avatar>
                <a-badge v-if="!item.is_read" dot color="red">
                  <BellOutlined class="notif-icon" />
                </a-badge>
                <BellOutlined v-else class="notif-icon" />
              </template>
              <template #title>
                <a-typography-text :strong="!item.is_read">{{ item.title }}</a-typography-text>
              </template>
              <template #description>
                <div>{{ item.content }}</div>
                <div class="notif-meta">
                  <a-tag :color="typeColor(item.type)" size="small">{{ typeLabel(item.type) }}</a-tag>
                  <span>{{ item.created_at?.slice(0, 16) }}</span>
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
        <template #empty>
          <a-empty description="暂无通知" />
        </template>
      </a-list>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { BellOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { getNotifications, markAsRead, remindAll } from '../api/notifications'
import { useAuthStore } from '../store/auth'
import { useNotificationStore } from '../store/notification'

const auth = useAuthStore()
const notifStore = useNotificationStore()
const loading = ref(false)
const list = ref([])
const filterType = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 15,
  total: 0,
  showTotal: (t) => `共 ${t} 条`,
  onChange: fetchData
})

async function fetchData() {
  loading.value = true
  try {
    const params = { page: pagination.current, pageSize: pagination.pageSize }
    if (filterType.value !== '') params.is_read = filterType.value
    const res = await getNotifications(params)
    list.value = res.data.list
    pagination.total = res.data.total
    notifStore.updateUnread(res.data.unreadCount)
  } finally {
    loading.value = false
  }
}

async function handleRead(item) {
  if (item.is_read) return
  try {
    await markAsRead(item.id)
    item.is_read = 1
    notifStore.updateUnread(notifStore.unreadCount - 1)
  } catch { /* ignore */ }
}

async function handleRemind() {
  try {
    await remindAll()
    message.success('提醒已发送')
  } catch { /* ignore */ }
}

function typeColor(type) {
  const map = { inspection: 'blue', rectify: 'orange', remind: 'red', system: 'default' }
  return map[type] || 'default'
}

function typeLabel(type) {
  const map = { inspection: '检查', rectify: '整改', remind: '提醒', system: '系统' }
  return map[type] || type
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.notif-icon { font-size: 20px; color: #1890ff; }
.notif-meta { display: flex; align-items: center; gap: 12px; margin-top: 6px; color: #999; font-size: 12px; }
.unread { background: #e6f7ff; cursor: pointer; border-radius: 6px; padding: 0 12px; }
</style>
