import http from './index'

export function getUnchecked() {
  return http.get('/statistics/unchecked')
}

export function getIssues() {
  return http.get('/statistics/issues')
}

export function getRanking() {
  return http.get('/statistics/ranking')
}

export function getReport() {
  return http.get('/statistics/report')
}

export function exportExcel() {
  return http.get('/statistics/export-excel', { responseType: 'blob' })
}

export function exportInspectionRecords() {
  return http.get('/statistics/export-inspection-records', { responseType: 'blob' })
}

export function createExportTask(data) {
  return http.post('/statistics/export-records', data)
}

export function getExportStatus(taskId) {
  return http.get(`/statistics/export-status/${taskId}`)
}

export function downloadExportFile(taskId) {
  return http.get(`/statistics/export-download/${taskId}`, { responseType: 'blob' })
}
