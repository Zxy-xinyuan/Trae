import http from './index'

export function submitInspection(formData) {
  return http.post('/inspections', formData)
}

export function getInspections(params) {
  return http.get('/inspections', { params })
}

export function auditInspection(id, data) {
  return http.put(`/inspections/${id}/audit`, data)
}

export function rectifyInspection(id, formData) {
  return http.put(`/inspections/${id}/rectify`, formData)
}

export function confirmInspection(id) {
  return http.put(`/inspections/${id}/confirm`)
}

export function batchAuditInspections(data) {
  return http.post('/inspections/batch-audit', data)
}
