<template>
  <div class="inspection-list">
    <div class="page-header">
      <h3 class="page-title">检查记录</h3>
      <a-space>
        <a-button type="primary" @click="$router.push('/inspections/submit')" v-if="auth.isManager || auth.isInspector">
          <FormOutlined /> 提交检查
        </a-button>
      </a-space>
    </div>

    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="状态">
          <a-select v-model:value="filters.status" placeholder="全部" allowClear style="width: 140px" @change="onFilterChange">
            <a-select-option v-for="(v, k) in INSPECTION_STATUS" :key="k" :value="k">
              {{ v.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="工作室" v-if="auth.isAdmin || auth.isInspector">
          <a-select v-model:value="filters.studio_id" placeholder="全部" allowClear style="width: 160px" @change="fetchData">
            <a-select-option v-for="s in studios" :key="s.id" :value="s.id">
              {{ s.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button @click="fetchData">刷新</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card
      v-if="auth.isAdmin && filters.status === 'pending' && selectedRowKeys.length > 0"
      :bordered="false"
      class="batch-action-bar"
      size="small"
    >
      <a-space size="middle">
        <a-checkbox
          :checked="isAllPageSelected"
          :indeterminate="selectedRowKeys.length > 0 && selectedRowKeys.length < list.length"
          @change="handleSelectAll"
        >
          已选 <strong>{{ selectedRowKeys.length }}</strong> 项
        </a-checkbox>
        <a-button type="primary" size="small" @click="openBatchAudit('approved')">
          <CheckOutlined /> 批量通过
        </a-button>
        <a-button type="primary" danger size="small" @click="openBatchAudit('needs_rectify')">
          <CloseOutlined /> 批量驳回
        </a-button>
        <a-button size="small" @click="selectedRowKeys = []">取消选择</a-button>
      </a-space>
    </a-card>

    <a-table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      :row-selection="rowSelection"
      row-key="id"
      :scroll="{ x: 1100 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'studio_name'">
          <span>{{ record.studio_name }}</span>
        </template>
        <template v-if="column.key === 'fire_safety'">
          <a-tag :color="record.fire_safety ? 'green' : 'red'">
            {{ record.fire_safety ? '通过' : '不通过' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'electrical_safety'">
          <a-tag :color="record.electrical_safety ? 'green' : 'red'">
            {{ record.electrical_safety ? '通过' : '不通过' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'equipment_safety'">
          <a-tag :color="record.equipment_safety ? 'green' : 'red'">
            {{ record.equipment_safety ? '通过' : '不通过' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'environment_safety'">
          <a-tag :color="record.environment_safety ? 'green' : 'red'">
            {{ record.environment_safety ? '通过' : '不通过' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="INSPECTION_STATUS[record.status]?.color">
            {{ INSPECTION_STATUS[record.status]?.label || record.status }}
          </a-tag>
          <a-tag v-if="record.severity" color="error" style="margin-left: 4px">{{ record.severity }}</a-tag>
        </template>
        <template v-if="column.key === 'submitted_at'">
          {{ record.submitted_at?.slice(0, 16) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="$router.push(`/inspections/${record.id}`)">详情</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:visible="batchAuditVisible"
      :title="`批量审核 (${selectedRowKeys.length} 条记录)`"
      @ok="handleBatchAudit"
      :confirmLoading="batchAuditLoading"
      width="520"
    >
      <a-form :model="batchAuditForm" layout="vertical">
        <a-form-item label="审核结果">
          <a-radio-group v-model:value="batchAuditForm.status" disabled>
            <a-radio value="approved">通过</a-radio>
            <a-radio value="needs_rectify">需整改</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="严重程度" v-if="batchAuditForm.status === 'needs_rectify'">
          <a-select v-model:value="batchAuditForm.severity" placeholder="请选择严重程度">
            <a-select-option v-for="s in SEVERITY_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="统一审核意见">
          <a-textarea v-model:value="batchAuditForm.audit_comment" :rows="3" placeholder="审核意见将应用于所有选中记录（可选）" />
        </a-form-item>
        <a-alert
          type="warning"
          show-icon
          message="提示"
          description="批量审核将使用相同的审核结果和意见应用于所有选中的记录，操作不可撤销，请谨慎操作。"
          style="margin-bottom: 8px"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { FormOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getInspections, batchAuditInspections } from '../api/inspections'
import { getStudios } from '../api/studios'
import { useAuthStore } from '../store/auth'
import { INSPECTION_STATUS, SEVERITY_OPTIONS } from '../utils/constants'

const auth = useAuthStore()
const loading = ref(false)
const list = ref([])
const studios = ref([])
const selectedRowKeys = ref([])
const batchAuditVisible = ref(false)
const batchAuditLoading = ref(false)
const batchAuditForm = reactive({ status: 'approved', severity: undefined, audit_comment: '' })

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const filters = reactive({ status: undefined, studio_id: undefined })

const columns = [
  { title: '工作室', key: 'studio_name', dataIndex: 'studio_name', width: 160, ellipsis: true },
  { title: '提交人', dataIndex: 'submitter_name', width: 100 },
  { title: '消防安全', key: 'fire_safety', width: 100, align: 'center' },
  { title: '用电安全', key: 'electrical_safety', width: 100, align: 'center' },
  { title: '设备安全', key: 'equipment_safety', width: 100, align: 'center' },
  { title: '环境安全', key: 'environment_safety', width: 100, align: 'center' },
  { title: '状态', key: 'status', width: 140 },
  { title: '严重程度', dataIndex: 'severity', width: 100 },
  { title: '提交时间', key: 'submitted_at', width: 170 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' }
]

const isAllPageSelected = computed(() => {
  return list.value.length > 0 && selectedRowKeys.value.length === list.value.length
})

const rowSelection = computed(() => {
  if (!auth.isAdmin || filters.status !== 'pending') {
    return undefined
  }
  return {
    selectedRowKeys: selectedRowKeys.value,
    onChange: (keys) => {
      selectedRowKeys.value = keys
    }
  }
})

function handleSelectAll(e) {
  if (e.target.checked) {
    selectedRowKeys.value = list.value.map(item => item.id)
  } else {
    selectedRowKeys.value = []
  }
}

function onFilterChange() {
  selectedRowKeys.value = []
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getInspections({
      page: pagination.current,
      pageSize: pagination.pageSize,
      status: filters.status,
      studio_id: filters.studio_id
    })
    list.value = res.data.list
    pagination.total = res.data.total
  } finally {
    loading.value = false
  }
}

function onTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  selectedRowKeys.value = []
  fetchData()
}

function openBatchAudit(status) {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要审核的记录')
    return
  }
  batchAuditForm.status = status
  batchAuditForm.severity = undefined
  batchAuditForm.audit_comment = ''
  batchAuditVisible.value = true
}

async function handleBatchAudit() {
  batchAuditLoading.value = true
  try {
    await batchAuditInspections({
      ids: selectedRowKeys.value,
      status: batchAuditForm.status,
      severity: batchAuditForm.severity,
      audit_comment: batchAuditForm.audit_comment
    })
    message.success(`批量审核完成，成功处理 ${selectedRowKeys.value.length} 条记录`)
    batchAuditVisible.value = false
    selectedRowKeys.value = []
    fetchData()
  } catch (err) {
    const msg = err?.response?.data?.message || '批量审核失败'
    message.error(msg)
  } finally {
    batchAuditLoading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getStudios()
    studios.value = res.data
  } catch { /* ignore */ }
  fetchData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title { margin: 0; font-size: 20px; font-weight: 600; }
.batch-action-bar {
  margin-bottom: 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}
</style>
