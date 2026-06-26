<template>
  <div class="studio-list">
    <div class="page-header">
      <h3 class="page-title">工作室管理</h3>
      <a-button type="primary" @click="$router.push('/studios/create')">
        <PlusOutlined /> 新增工作室
      </a-button>
    </div>

    <a-table :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="$router.push(`/studios/${record.id}/edit`)">编辑</a-button>
            <a-popconfirm title="确定删除该工作室吗？" @confirm="handleDelete(record.id)">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getStudios, deleteStudio } from '../api/studios'
import { message } from 'ant-design-vue'

const loading = ref(false)
const list = ref([])

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '工作室名称', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'manager_name' },
  { title: '创建时间', dataIndex: 'created_at' },
  { title: '操作', key: 'action', width: 160, fixed: 'right' }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getStudios()
    list.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  try {
    await deleteStudio(id)
    message.success('删除成功')
    fetchData()
  } catch { /* ignore */ }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
</style>
