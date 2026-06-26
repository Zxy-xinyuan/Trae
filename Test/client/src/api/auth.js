import http from './index'

export function login(data) {
  return http.post('/auth/login', data)
}

export function getUserInfo() {
  return http.get('/auth/me')
}
