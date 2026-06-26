import http from './index'

export function changePassword(data) {
  return http.put('/settings/password', data)
}

export function publishNotify(data) {
  return http.post('/settings/notify', data)
}
