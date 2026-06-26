<template>
  <div class="unchecked-view">
    <div class="page-header">
      <h3 class="page-title">未提交检查工作室名单</h3>
      <a-tag color="blue">检查周期: {{ periodDays }} 天</a-tag>
    </div>

    <a-result v-if="!list.length" status="success" title="全部工作室均已提交检查！" sub-title="所有工作室在检查周期内均已完成安全检查。">
      <template #extra>
        <a-button type="primary" @click="fetchData">刷新</a-button>
      </template>
    </a-result>

    <a-card :bordered="false" v-else>
      <a-alert :message="`以下 ${list.length} 个工作室在近 ${periodDays} 天内未提交安全检查`" type="warning" show-icon style="margin-bottom: 16px" />
      <a-table :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag color="red">未提交</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUnchecked } from '../api/statistics'

const loading = ref(false)
const list = ref([])
const periodDays = ref(7)

const columns = [
  { title: '工作室名称', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'manager_name' },
  { title: '状态', key: 'status', width: 100 }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getUnchecked()
    list.value = res.data.list
    periodDays.value = res.data.periodDays
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
</style>
