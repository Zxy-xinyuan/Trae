<template>
  <div class="rectify-view">
    <div class="page-header">
      <h3 class="page-title">我的整改任务</h3>
      <a-space>
        <a-tag v-if="hasPending" color="red">
          <WarningOutlined /> 您有 {{ needsRectifyCount + rectifyingCount }} 项整改任务
        </a-tag>
        <a-button size="small" @click="fetchData">
          <ReloadOutlined /> 刷新
        </a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-result
        v-if="!hasPending"
        status="success"
        title="暂无需整改项目"
        sub-title="您工作室的检查记录均已通过或完成整改"
      >
        <template #extra>
          <a-space>
            <a-button @click="$router.push('/inspections')">查看检查记录</a-button>
            <a-button type="primary" @click="$router.push('/profile')">返回工作室档案</a-button>
          </a-space>
        </template>
      </a-result>

      <template v-else>
        <a-card :bordered="false" style="margin-bottom: 16px">
          <a-tabs v-model:activeKey="activeTab">
            <a-tab-pane key="needs_rectify">
              <template #tab>
                <a-badge :count="needsRectifyCount" :offset="[6, -2]" :number-style="{ backgroundColor: '#ff4d4f', fontSize: '10px' }">
                  <span style="padding-right: 4px">待提交整改</span>
                </a-badge>
              </template>
            </a-tab-pane>
            <a-tab-pane key="rectifying">
              <template #tab>
                <a-badge :count="rectifyingCount" :offset="[6, -2]" :number-style="{ backgroundColor: '#1890ff', fontSize: '10px' }">
                  <span style="padding-right: 4px">整改待确认</span>
                </a-badge>
              </template>
            </a-tab-pane>
          </a-tabs>

          <a-table
            :columns="columns"
            :data-source="filteredList"
            :loading="loading"
            :pagination="false"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'index'">
                {{ filteredList.indexOf(record) + 1 }}
              </template>
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === 'needs_rectify' ? 'red' : 'blue'">
                  {{ record.status === 'needs_rectify' ? '等待您提交整改' : '等待管理员确认' }}
                </a-tag>
              </template>
              <template v-if="column.key === 'severity'">
                <a-tag v-if="record.severity" :color="SEVERITY_COLOR[record.severity] || 'default'">
                  {{ record.severity }}
                </a-tag>
                <span v-else>—</span>
              </template>
              <template v-if="column.key === 'submitted_at'">
                {{ record.submitted_at?.slice(0, 16) }}
              </template>
              <template v-if="column.key === 'audit_comment'">
                <a-typography-text ellipsis :style="{ maxWidth: '180px' }" :content="record.audit_comment || '—'" />
              </template>
              <template v-if="column.key === 'action'">
                <a-button type="primary" size="small" @click="$router.push(`/inspections/${record.id}`)">
                  去处理
                </a-button>
              </template>
            </template>
          </a-table>
        </a-card>

        <a-card title="整改历史" :bordered="false">
          <a-table
            :columns="historyColumns"
            :data-source="completedList"
            :pagination="{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'submitted_at'">
                {{ record.submitted_at?.slice(0, 16) }}
              </template>
              <template v-if="column.key === 'completed_at'">
                {{ record.completed_at?.slice(0, 16) }}
              </template>
              <template v-if="column.key === 'status'">
                <a-tag color="green">已完成</a-tag>
              </template>
            </template>
            <template #empty>
              <a-empty description="暂无整改历史" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </template>
          </a-table>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getInspections } from '../api/inspections'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const loading = ref(false)
const activeTab = ref('needs_rectify')
const fullList = ref([])

const SEVERITY_COLOR = { '一般': 'blue', '较重': 'orange', '严重': 'red' }

const myItems = computed(() => {
  const myStudioName = auth.user?.studio_name || ''
  return fullList.value.filter(i =>
    i.studio_name === myStudioName &&
    (i.status === 'needs_rectify' || i.status === 'rectifying' || i.status === 'completed')
  )
})

const needsRectifyCount = computed(() => myItems.value.filter(i => i.status === 'needs_rectify').length)
const rectifyingCount = computed(() => myItems.value.filter(i => i.status === 'rectifying').length)
const hasPending = computed(() => needsRectifyCount.value + rectifyingCount.value > 0)

const filteredList = computed(() => myItems.value.filter(i => i.status === activeTab.value))
const completedList = computed(() => myItems.value.filter(i => i.status === 'completed'))

const columns = [
  { title: '#', key: 'index', width: 40 },
  { title: '状态', key: 'status', width: 130 },
  { title: '严重程度', key: 'severity', width: 90 },
  { title: '审核意见', key: 'audit_comment' },
  { title: '提交时间', key: 'submitted_at', width: 150 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' }
]

const historyColumns = [
  { title: '状态', key: 'status', width: 80 },
  { title: '严重程度', key: 'severity', width: 90 },
  { title: '审核意见', key: 'audit_comment' },
  { title: '提交时间', key: 'submitted_at', width: 150 },
  { title: '完成时间', key: 'completed_at', width: 150 }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getInspections({ pageSize: 500 })
    fullList.value = res.data.list || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
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
.page-title { margin: 0; }
</style>
