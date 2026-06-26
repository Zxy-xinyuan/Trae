<template>
  <div class="studio-form">
    <a-page-header :title="isEdit ? '编辑工作室' : '新增工作室'" @back="$router.back()" />

    <a-card :bordered="false" style="max-width: 600px; margin: 0 auto">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
        <a-form-item label="工作室名称" name="name">
          <a-input v-model:value="form.name" placeholder="请输入工作室名称" />
        </a-form-item>
        <a-form-item label="负责人">
          <a-select v-model:value="form.manager_id" placeholder="请选择负责人（可选）" allowClear show-search option-filter-prop="label" :options="managerOptions" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" size="large" :loading="loading" block html-type="submit">
            {{ isEdit ? '保存修改' : '创建工作室' }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getStudios, createStudio, updateStudio } from '../api/studios'
import { getUserInfo } from '../api/auth'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const loading = ref(false)
const isEdit = computed(() => !!route.params.id)
const managerOptions = ref([])

const form = reactive({ name: '', manager_id: undefined })

const rules = {
  name: [{ required: true, message: '请输入工作室名称' }]
}

onMounted(async () => {
  try {
    const studiosRes = await getStudios()
    if (isEdit.value) {
      const studio = studiosRes.data.find(s => s.id === parseInt(route.params.id))
      if (studio) {
        form.name = studio.name
        form.manager_id = studio.manager_id
      }
    }
    managerOptions.value = studiosRes.data.map(s => ({
      label: s.manager_name || '(未指定)',
      value: s.manager_id
    })).filter(m => m.value)
  } catch { /* ignore */ }
})

async function handleSubmit() {
  loading.value = true
  try {
    if (isEdit.value) {
      await updateStudio(route.params.id, { name: form.name, manager_id: form.manager_id })
      message.success('更新成功')
    } else {
      await createStudio({ name: form.name, manager_id: form.manager_id })
      message.success('创建成功')
    }
    router.push('/studios')
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}
</script>
