<template>
  <div class="inspection-form">
    <h3 class="page-title">提交安全检查</h3>
    <a-card :bordered="false">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="选择工作室" name="studio_id">
          <a-select
            v-model:value="form.studio_id"
            placeholder="请选择要检查的工作室"
            :options="studioOptions"
          />
        </a-form-item>

        <a-divider orientation="left">安全检查项</a-divider>
        <p class="form-tip">请逐项检查并勾选通过/不通过：</p>

        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" v-for="item in checkItems" :key="item.key">
            <a-card size="small" :class="['check-card', form[item.key] ? 'pass' : 'fail']">
              <div class="check-item">
                <span class="check-label">
                  <component :is="item.icon" style="margin-right: 8px" />
                  {{ item.label }}
                </span>
                <a-radio-group v-model:value="form[item.key]" button-style="solid" size="small">
                  <a-radio-button :value="1">✓ 通过</a-radio-button>
                  <a-radio-button :value="0">✗ 不通过</a-radio-button>
                </a-radio-group>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <a-divider orientation="left">现场照片</a-divider>
        <a-form-item name="photo" label="拍摄检查现场照片（会自动添加时间+工作室水印）">
          <PhotoUploader ref="photoRef" v-model="photoList" :maxCount="1" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" size="large" :loading="submitting" @click="handleSubmit" block>
            一键提交检查
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { FireOutlined, ThunderboltOutlined, ToolOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import { getStudios } from '../api/studios'
import { submitInspection } from '../api/inspections'
import PhotoUploader from '../components/PhotoUploader.vue'
import { CHECK_ITEMS } from '../utils/constants'

const router = useRouter()
const formRef = ref()
const photoRef = ref()
const photoList = ref([])
const submitting = ref(false)
const studioOptions = ref([])

const checkItems = [
  { key: 'fire_safety', label: '消防安全', icon: FireOutlined },
  { key: 'electrical_safety', label: '用电安全', icon: ThunderboltOutlined },
  { key: 'equipment_safety', label: '设备安全', icon: ToolOutlined },
  { key: 'environment_safety', label: '环境安全', icon: EnvironmentOutlined }
]

const form = reactive({
  studio_id: undefined,
  fire_safety: 1,
  electrical_safety: 1,
  equipment_safety: 1,
  environment_safety: 1
})

const rules = {
  studio_id: [{ required: true, message: '请选择工作室' }]
}

onMounted(async () => {
  try {
    const res = await getStudios()
    studioOptions.value = res.data.map(s => ({ label: s.name, value: s.id }))
  } catch { /* ignore */ }
})

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch { return }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('studio_id', form.studio_id)
    fd.append('fire_safety', form.fire_safety)
    fd.append('electrical_safety', form.electrical_safety)
    fd.append('equipment_safety', form.equipment_safety)
    fd.append('environment_safety', form.environment_safety)

    const files = photoRef.value?.getFiles()
    if (files && files.length > 0) {
      fd.append('photo', files[0])
    }

    await submitInspection(fd)
    message.success('检查提交成功，等待管理员审核')
    router.push('/inspections')
  } catch { /* error handled by interceptor */ } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-title { margin-bottom: 24px; }
.form-tip { color: #888; margin-bottom: 12px; }
.check-card { margin-bottom: 4px; }
.check-card.pass { border-left: 3px solid #52c41a; }
.check-card.fail { border-left: 3px solid #ff4d4f; }
.check-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.check-label {
  font-size: 15px;
  font-weight: 500;
}
</style>
