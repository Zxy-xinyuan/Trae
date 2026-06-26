import http from './index'

export function getNotifications(params) {
  return http.get('/notifications', { params })
}

export function markAsRead(id) {
  return http.put(`/notifications/${id}/read`)
}

export function remindAll() {
  return http.post('/notifications/remind')
}
