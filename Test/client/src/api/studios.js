import http from './index'

export function getStudios() {
  return http.get('/studios')
}

export function createStudio(data) {
  return http.post('/studios', data)
}

export function updateStudio(id, data) {
  return http.put(`/studios/${id}`, data)
}

export function deleteStudio(id) {
  return http.delete(`/studios/${id}`)
}
