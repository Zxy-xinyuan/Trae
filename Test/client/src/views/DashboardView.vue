<template>
  <div class="dashboard">
    <div class="page-welcome">
      <div>
        <h3 class="page-title">工作台</h3>
        <p class="page-desc">{{ greeting }}，{{ auth.user?.real_name || '管理员' }}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="(stat, i) in stats" :key="stat.key" :class="'stat-' + i">
        <div class="stat-icon" :style="{ background: stat.bg }">
          <component :is="stat.icon" />
        </div>
        <div class="stat-body">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.title }}</span>
        </div>
      </div>
    </div>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :xs="24" :lg="16">
        <a-card title="待审核与整改" :bordered="false" class="content-card">
          <a-tabs v-model:activeKey="tabKey" class="dash-tabs">
            <a-tab-pane key="pending">
              <template #tab>
                <span class="tab-with-badge">待审核<a-badge :count="stats[0].value" :number-style="{ backgroundColor: '#F5A623' }" :offset="[6, -2]" /></span>
              </template>
              <a-list :loading="loading" :data-source="pendingList" size="small" class="dash-list">
                <template #renderItem="{ item }">
                  <a-list-item class="dash-list-item">
                    <a-list-item-meta>
                      <template #title>
                        <a @click="$router.push(`/inspections/${item.id}`)" class="item-link">
                          {{ item.studio_name }} — 安全检查
                        </a>
                      </template>
                      <template #description>
                        <span class="item-meta">提交时间: {{ item.submitted_at?.slice(0, 16) }}</span>
                        <span class="item-meta">提交人: {{ item.submitter_name }}</span>
                      </template>
                    </a-list-item-meta>
                    <template #actions><a-tag color="orange">待审核</a-tag></template>
                  </a-list-item>
                </template>
                <template #empty><a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无待审核记录" /></template>
              </a-list>
            </a-tab-pane>
            <a-tab-pane key="rectifying">
              <template #tab>
                <span class="tab-with-badge">整改中<a-badge :count="stats[2].value" :number-style="{ backgroundColor: '#3B82F6' }" :offset="[6, -2]" /></span>
              </template>
              <a-list :loading="loading" :data-source="rectifyingList" size="small" class="dash-list">
                <template #renderItem="{ item }">
                  <a-list-item class="dash-list-item">
                    <a-list-item-meta>
                      <template #title>
                        <a @click="$router.push(`/inspections/${item.id}`)" class="item-link">
                          {{ item.studio_name }} — 需整改
                        </a>
                      </template>
                      <template #description>
                        <span class="item-meta">审核意见: {{ item.audit_comment || '无' }}</span>
                      </template>
                    </a-list-item-meta>
                    <template #actions><a-tag color="blue">整改中</a-tag></template>
                  </a-list-item>
                </template>
                <template #empty><a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无待整改记录" /></template>
              </a-list>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card title="快捷操作" :bordered="false" class="content-card">
          <div class="quick-actions">
            <div class="quick-item" @click="$router.push('/inspections')">
              <span class="quick-icon" style="background: #EEF2FF; color: #4F46E5"><FileSearchOutlined /></span>
              <span class="quick-label">检查记录</span>
            </div>
            <div class="quick-item" @click="$router.push('/studios')">
              <span class="quick-icon" style="background: #FEF3C7; color: #D97706"><ApartmentOutlined /></span>
              <span class="quick-label">工作室管理</span>
            </div>
            <div class="quick-item" @click="$router.push('/notifications')">
              <span class="quick-icon" style="background: #FEE2E2; color: #DC2626"><BellOutlined /></span>
              <span class="quick-label">通知消息</span>
            </div>
            <div class="quick-item" @click="$router.push('/report')">
              <span class="quick-icon" style="background: #D1FAE5; color: #059669"><BarChartOutlined /></span>
              <span class="quick-label">统计分析</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Empty } from 'ant-design-vue'
import {
  FileSearchOutlined, BellOutlined, BarChartOutlined, ApartmentOutlined,
  SafetyCertificateOutlined, CheckCircleOutlined, WarningOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import { getInspections } from '../api/inspections'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const loading = ref(false)
const tabKey = ref('pending')

const pendingList = ref([])
const rectifyingList = ref([])

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const stats = reactive([
  { key: 'pending', title: '待审核', value: 0, color: '#F5A623', bg: '#FFF7ED', icon: ClockCircleOutlined },
  { key: 'approved', title: '已通过', value: 0, color: '#10B981', bg: '#ECFDF5', icon: CheckCircleOutlined },
  { key: 'needs_rectify', title: '需整改', value: 0, color: '#EF4444', bg: '#FEF2F2', icon: WarningOutlined },
  { key: 'completed', title: '已完成', value: 0, color: '#2C6E9E', bg: '#EDF5FA', icon: SafetyCertificateOutlined }
])

async function fetchData() {
  loading.value = true
  try {
    const res = await getInspections({ pageSize: 200 })
    const list = res.data.list
    const sc = { pending: 0, approved: 0, needs_rectify: 0, completed: 0, rectifying: 0 }
    list.forEach(item => { if (sc[item.status] !== undefined) sc[item.status]++ })
    stats[0].value = sc.pending + sc.rectifying
    stats[1].value = sc.approved
    stats[2].value = sc.needs_rectify
    stats[3].value = sc.completed
    pendingList.value = list.filter(i => i.status === 'pending')
    rectifyingList.value = list.filter(i => i.status === 'needs_rectify' || i.status === 'rectifying')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-welcome {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
  gap: var(--space-3);
}
.page-title { margin: 0; font-size: var(--text-3xl); font-weight: var(--weight-bold); }
.page-desc { margin: var(--space-1) 0 0; color: var(--gray-400); font-size: var(--text-sm); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}
.stat-card {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
  border: var(--border-card);
  transition: all var(--transition-base);
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-value {
  font-size: 28px;
  font-weight: var(--weight-bold);
  color: var(--gray-800);
  line-height: 1.1;
}
.stat-label {
  font-size: var(--text-xs);
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
  font-weight: var(--weight-medium);
}

.content-card {
  transition: box-shadow var(--transition-base);
}

.dash-tabs :deep(.ant-tabs-tab) {
  padding: var(--space-2) 0;
}
.tab-with-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dash-list :deep(.ant-list-item) {
  padding: var(--space-3) 0;
  border-bottom: var(--border-light);
}
.dash-list :deep(.ant-list-item:last-child) { border-bottom: none; }
.dash-list-item {
  transition: background var(--transition-fast);
}
.dash-list-item:hover {
  background: var(--gray-50);
}
.item-link {
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
}
.item-meta {
  font-size: var(--text-xs);
  color: var(--gray-400);
  margin-right: var(--space-3);
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 1px solid transparent;
}
.quick-item:hover {
  background: var(--gray-50);
  border-color: var(--gray-200);
  transform: translateY(-1px);
}
.quick-item:active { transform: scale(0.98); }
.quick-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.quick-label {
  font-size: var(--text-xs);
  color: var(--gray-600);
  font-weight: var(--weight-medium);
}

@media (max-width: 767px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .stat-card { padding: var(--space-3); }
  .stat-icon { width: 36px; height: 36px; font-size: 18px; }
  .stat-value { font-size: 22px; }
  .page-title { font-size: var(--text-2xl); }
  .quick-actions { grid-template-columns: 1fr 1fr; }
}
</style>
