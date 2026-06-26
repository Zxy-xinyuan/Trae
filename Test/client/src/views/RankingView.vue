<template>
  <div class="ranking-view">
    <h3 class="page-title">工作室检查排名</h3>
    <a-spin :spinning="loading">
      <a-card :bordered="false" style="margin-bottom: 16px">
        <div ref="chartRef" style="height: 400px"></div>
        <a-empty v-if="!hasData" description="暂无数据" style="height: 400px; display: flex; align-items: center; justify-content: center" />
      </a-card>
      <a-card title="排行榜" :bordered="false">
        <a-table :columns="rankColumns" :data-source="rankData" :pagination="false" row-key="studio_id" size="middle">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'rank'">
              <a-tag v-if="index === 0" color="gold">🥇 1</a-tag>
              <a-tag v-else-if="index === 1" color="#cdcdcd">🥈 2</a-tag>
              <a-tag v-else-if="index === 2" color="#cd7f32">🥉 3</a-tag>
              <span v-else>{{ index + 1 }}</span>
            </template>
            <template v-if="column.key === 'pass_rate'">
              <a-progress :percent="record.pass_rate" :size="20" :strokeColor="record.pass_rate >= 80 ? '#52c41a' : record.pass_rate >= 60 ? '#faad14' : '#ff4d4f'" />
            </template>
          </template>
        </a-table>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getRanking } from '../api/statistics'

const loading = ref(false)
const rankData = ref([])
const chartRef = ref(null)
const hasData = ref(true)

let chart = null

const rankColumns = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '工作室', dataIndex: 'studio_name' },
  { title: '检查总数', dataIndex: 'total_inspections', width: 100 },
  { title: '通过数', dataIndex: 'passed_inspections', width: 100 },
  { title: '通过率', key: 'pass_rate', width: 250 }
]

function handleResize() {
  if (chart) chart.resize()
}

onUnmounted(() => {
  if (chart) { chart.dispose(); chart = null }
  window.removeEventListener('resize', handleResize)
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getRanking()
    rankData.value = res.data || []
    await nextTick()
    renderChart()
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  const data = rankData.value
  if (data.length === 0) { hasData.value = false; return }
  hasData.value = true

  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)

  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['检查总数', '通过数'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(r => r.studio_name),
      axisLabel: { rotate: data.length > 3 ? 30 : 0, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11 }
    },
    series: [
      {
        name: '检查总数',
        type: 'bar',
        data: data.map(r => r.total_inspections),
        barMaxWidth: 40,
        itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: '通过数',
        type: 'bar',
        data: data.map(r => r.passed_inspections),
        barMaxWidth: 40,
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] }
      }
    ]
  })

  window.removeEventListener('resize', handleResize)
  window.addEventListener('resize', handleResize)
}

onMounted(fetchData)
</script>

<style scoped>
.page-title { margin-bottom: 24px; }
</style>
