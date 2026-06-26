import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getNotifications as fetchNotifs, markAsRead as readApi } from '../api/notifications'

export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)
  const list = ref([])

  async function fetchNotifications(params = {}) {
    const res = await fetchNotifs({ pageSize: 50, ...params })
    list.value = res.data.list
    unreadCount.value = res.data.unreadCount
    return res.data
  }

  async function markAsRead(id) {
    await readApi(id)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  function updateUnread(count) {
    unreadCount.value = count
  }

  return { unreadCount, list, fetchNotifications, markAsRead, updateUnread }
})
