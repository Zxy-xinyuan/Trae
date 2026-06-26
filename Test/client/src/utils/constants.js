export const INSPECTION_STATUS = {
  pending: { label: '待审核', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  needs_rectify: { label: '需整改', color: 'red' },
  rectifying: { label: '整改中', color: 'blue' },
  completed: { label: '已完成', color: 'green' }
}

export const SEVERITY_OPTIONS = [
  { label: '一般', value: '一般', color: 'blue' },
  { label: '较重', value: '较重', color: 'orange' },
  { label: '严重', value: '严重', color: 'red' }
]

export const ROLE_MAP = {
  admin: { label: '管理员', color: 'red' },
  manager: { label: '工作室负责人', color: 'blue' },
  inspector: { label: '安全检查负责人', color: 'green' }
}

export const CHECK_ITEMS = [
  { key: 'fire_safety', label: '消防安全', icon: 'FireOutlined' },
  { key: 'electrical_safety', label: '用电安全', icon: 'ThunderboltOutlined' },
  { key: 'equipment_safety', label: '设备安全', icon: 'ToolOutlined' },
  { key: 'environment_safety', label: '环境安全', icon: 'EnvironmentOutlined' }
]
