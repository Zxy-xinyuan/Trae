<template>
  <div class="report-view">
    <div class="page-header">
      <h3 class="page-title">统计报表</h3>
      <a-space wrap>
        <a-range-picker
          v-model:value="exportTimeRange"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
          :presets="timePresets"
          style="width: 380px"
        />
        <a-button type="primary" :loading="exportTaskStatus === 'processing'" @click="handleExportRecords">
          <DownloadOutlined /> 导出记录（含照片）
        </a-button>
      </a-space>
    </div>

    <a-modal
      v-model:visible="exportModalVisible"
      title="导出检查记录"
      :footer="null"
      :closable="exportTaskStatus !== 'processing'"
      :maskClosable="false"
      width="480"
    >
      <template v-if="exportTaskStatus === 'processing'">
        <div class="export-progress">
          <a-progress type="circle" :percent="exportProgress" :width="100" />
          <p class="export-msg">{{ exportMessage }}</p>
          <p class="export-detail" v-if="exportTotalRecords > 0">
            已处理 {{ exportProcessedRecords }} / {{ exportTotalRecords }} 条记录
          </p>
        </div>
      </template>
      <template v-else-if="exportTaskStatus === 'completed'">
        <a-result status="success" title="导出完成" :sub-title="exportMessage">
          <template #extra>
            <a-button type="primary" @click="handleDownload">下载文件</a-button>
            <a-button @click="exportModalVisible = false">关闭</a-button>
          </template>
        </a-result>
      </template>
      <template v-else-if="exportTaskStatus === 'failed'">
        <a-result status="error" title="导出失败" :sub-title="exportMessage">
          <template #extra>
            <a-button @click="exportModalVisible = false">关闭</a-button>
          </template>
        </a-result>
      </template>
    </a-modal>

    <a-spin :spinning="loading">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="6" v-for="item in overviewCards" :key="item.key">
          <a-card :bordered="false" class="stat-card">
            <a-statistic :value="item.value" :title="item.title" :value-style="{ color: item.color, fontSize: '28px' }" />
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" style="margin-top: 16px">
        <a-col :xs="24" :lg="12">
          <a-card title="月度趋势" :bordered="false">
            <div ref="monthlyChartRef" style="height: 350px"></div>
            <a-empty v-if="!monthlyHasData" description="暂无数据" style="height: 350px; display: flex; align-items: center; justify-content: center" />
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="12">
          <a-card title="各工作室情况" :bordered="false">
            <div ref="studioChartRef" style="height: 350px"></div>
            <a-empty v-if="!studioHasData" description="暂无数据" style="height: 350px; display: flex; align-items: center; justify-content: center" />
          </a-card>
        </a-col>
      </a-row>

      <a-card title="状态分布" :bordered="false" style="margin-top: 16px">
        <div ref="statusChartRef" style="height: 300px"></div>
        <a-empty v-if="!statusHasData" description="暂无数据" style="height: 300px; display: flex; align-items: center; justify-content: center" />
      </a-card>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { getReport, createExportTask, getExportStatus, downloadExportFile } from '../api/statistics'

const loading = ref(false)
const monthlyChartRef = ref(null)
const studioChartRef = ref(null)
const statusChartRef = ref(null)

const monthlyHasData = ref(true)
const studioHasData = ref(true)
const statusHasData = ref(true)

const exportTimeRange = ref([dayjs().subtract(7, 'day'), dayjs()])
const exportModalVisible = ref(false)
const exportTaskId = ref('')
const exportTaskStatus = ref('')
const exportProgress = ref(0)
const exportMessage = ref('')
const exportTotalRecords = ref(0)
const exportProcessedRecords = ref(0)
let exportPollTimer = null

const timePresets = [
  { label: '最近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: '最近30天', value: [dayjs().subtract(30, 'day'), dayjs()] },
  { label: '最近90天', value: [dayjs().subtract(90, 'day'), dayjs()] },
  { label: '本月', value: [dayjs().startOf('month'), dayjs()] },
  { label: '本年', value: [dayjs().startOf('year'), dayjs()] }
]

let monthlyChart = null
let studioChart = null
let statusChart = null

const overviewCards = reactive([
  { key: 'total', title: '总检查数', value: 0, color: '#1890ff' },
  { key: 'pending', title: '待审核', value: 0, color: '#faad14' },
  { key: 'needs_rectify', title: '需整改', value: 0, color: '#ff4d4f' },
  { key: 'completed', title: '已完成', value: 0, color: '#52c41a' }
])

function disposeAllCharts() {
  if (monthlyChart) { monthlyChart.dispose(); monthlyChart = null }
  if (studioChart) { studioChart.dispose(); studioChart = null }
  if (statusChart) { statusChart.dispose(); statusChart = null }
}

function handleResize() {
  if (monthlyChart) monthlyChart.resize()
  if (studioChart) studioChart.resize()
  if (statusChart) statusChart.resize()
}

onUnmounted(() => {
  disposeAllCharts()
  window.removeEventListener('resize', handleResize)
  if (exportPollTimer) clearInterval(exportPollTimer)
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getReport()
    const { overview, monthlyStats, studioStats } = res.data

    overviewCards[0].value = overview?.total_inspections || 0
    overviewCards[1].value = overview?.pending_count || 0
    overviewCards[2].value = overview?.needs_rectify_count || 0
    overviewCards[3].value = overview?.completed_count || 0

    await nextTick()
    renderCharts(monthlyStats, studioStats, overview)
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
}

function renderCharts(monthlyStats, studioStats, overview) {
  disposeAllCharts()

  renderMonthlyChart(monthlyStats)
  renderStudioChart(studioStats)
  renderStatusChart(overview)

  window.removeEventListener('resize', handleResize)
  window.addEventListener('resize', handleResize)
}

function renderMonthlyChart(monthlyStats) {
  if (!monthlyChartRef.value) return
  const data = monthlyStats || []
  if (data.length === 0) { monthlyHasData.value = false; return }
  monthlyHasData.value = true

  monthlyChart = echarts.init(monthlyChartRef.value)
  monthlyChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['总检查', '通过'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(m => m.month),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11 }
    },
    series: [
      {
        name: '总检查',
        type: 'line',
        data: data.map(m => m.total),
        smooth: true,
        areaStyle: { color: 'rgba(24,144,255,0.2)' },
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '通过',
        type: 'line',
        data: data.map(m => m.passed),
        smooth: true,
        areaStyle: { color: 'rgba(82,196,26,0.2)' },
        itemStyle: { color: '#52c41a' }
      }
    ]
  })
}

function renderStudioChart(studioStats) {
  if (!studioChartRef.value) return
  const data = studioStats || []
  if (data.length === 0) { studioHasData.value = false; return }
  studioHasData.value = true

  studioChart = echarts.init(studioChartRef.value)
  studioChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['通过', '待审核', '需整改', '整改中'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(s => s.studio_name),
      axisLabel: { rotate: data.length > 3 ? 30 : 0, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11 }
    },
    series: [
      { name: '通过', type: 'bar', data: data.map(s => s.passed), stack: 'total', itemStyle: { color: '#52c41a' }, barMaxWidth: 40 },
      { name: '待审核', type: 'bar', data: data.map(s => s.pending), stack: 'total', itemStyle: { color: '#faad14' }, barMaxWidth: 40 },
      { name: '需整改', type: 'bar', data: data.map(s => s.needs_rectify), stack: 'total', itemStyle: { color: '#ff4d4f' }, barMaxWidth: 40 },
      { name: '整改中', type: 'bar', data: data.map(s => s.rectifying), stack: 'total', itemStyle: { color: '#1890ff' }, barMaxWidth: 40 }
    ]
  })
}

function renderStatusChart(overview) {
  if (!statusChartRef.value) return
  const items = [
    { value: overview?.pending_count || 0, name: '待审核', color: '#faad14' },
    { value: overview?.approved_count || 0, name: '已通过', color: '#52c41a' },
    { value: overview?.needs_rectify_count || 0, name: '需整改', color: '#ff4d4f' },
    { value: overview?.rectifying_count || 0, name: '整改中', color: '#1890ff' },
    { value: overview?.completed_count || 0, name: '已完成', color: '#00d084' }
  ].filter(item => item.value > 0)

  if (items.length === 0) { statusHasData.value = false; return }
  statusHasData.value = true

  statusChart = echarts.init(statusChartRef.value)
  statusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}条 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '72%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      data: items.map(i => ({ value: i.value, name: i.name, itemStyle: { color: i.color } })),
      label: {
        formatter: '{b}\n{c}条\n({d}%)',
        fontSize: 12
      },
      emphasis: {
        label: { fontSize: 16, fontWeight: 'bold' },
        scaleSize: 6
      }
    }]
  })
}

async function handleExportRecords() {
  if (!exportTimeRange.value || exportTimeRange.value.length !== 2) {
    message.warning('请选择导出时间区间')
    return
  }

  const [startTime, endTime] = exportTimeRange.value
  if (!startTime || !endTime) {
    message.warning('请选择完整的导出时间区间')
    return
  }

  try {
    const res = await createExportTask({
      startTime: startTime.format('YYYY-MM-DD HH:mm:ss'),
      endTime: endTime.format('YYYY-MM-DD HH:mm:ss')
    })
    exportTaskId.value = res.data.data.taskId
    exportTaskStatus.value = 'processing'
    exportProgress.value = 0
    exportMessage.value = '正在准备导出...'
    exportTotalRecords.value = 0
    exportProcessedRecords.value = 0
    exportModalVisible.value = true

    startPolling()
  } catch (err) {
    message.error(err?.response?.data?.message || '创建导出任务失败')
  }
}

function startPolling() {
  if (exportPollTimer) clearInterval(exportPollTimer)
  exportPollTimer = setInterval(async () => {
    try {
      const res = await getExportStatus(exportTaskId.value)
      const { status, progress, message: msg, totalRecords, processedRecords } = res.data.data
      exportTaskStatus.value = status
      exportProgress.value = progress
      exportMessage.value = msg
      exportTotalRecords.value = totalRecords
      exportProcessedRecords.value = processedRecords

      if (status === 'completed' || status === 'failed') {
        clearInterval(exportPollTimer)
        exportPollTimer = null
      }
    } catch {
      clearInterval(exportPollTimer)
      exportPollTimer = null
      exportTaskStatus.value = 'failed'
      exportMessage.value = '获取导出状态失败'
    }
  }, 800)
}

async function handleDownload() {
  try {
    const blob = await downloadExportFile(exportTaskId.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = `安全检查记录导出_${dayjs().format('YYYY-MM-DD_HHmmss')}.zip`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    message.success('文件下载成功')
    exportModalVisible.value = false
  } catch {
    message.error('下载失败，请重试')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.page-title { margin: 0; }
.stat-card { text-align: center; border-radius: 8px; }
.export-progress { text-align: center; padding: 24px 0; }
.export-msg { margin-top: 20px; font-size: 15px; color: #333; }
.export-detail { margin-top: 4px; font-size: 13px; color: #888; }
</style>
