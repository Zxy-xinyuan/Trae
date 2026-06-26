<template>
  <a-badge :count="unread" :overflow-count="99" :dot="false">
    <BellOutlined
      class="bell-icon"
      :style="{ cursor: 'pointer', fontSize: '18px' }"
      @click="handleClick"
    />
  </a-badge>
</template>

<script setup>
import { BellOutlined } from '@ant-design/icons-vue'
import { useNotificationStore } from '../store/notification'
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'

const notifStore = useNotificationStore()
const router = useRouter()
const unread = computed(() => notifStore.unreadCount)

onMounted(async () => {
  try {
    await notifStore.fetchNotifications({ is_read: '0', pageSize: 1 })
  } catch { /* ignore */ }
})

function handleClick() {
  router.push('/notifications')
}
</script>
