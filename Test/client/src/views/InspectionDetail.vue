<template>
  <div class="inspection-detail">
    <a-page-header title="检查详情" @back="$router.back()">
      <template #extra>
        <a-space>
          <a-button v-if="auth.isAdmin && record.status === 'pending'" type="primary" @click="auditVisible = true">
            审核
          </a-button>
          <a-button v-if="auth.isManager && (record.status === 'needs_rectify' || record.status === 'rectifying')" type="primary" @click="rectifyVisible = true">
            提交整改
          </a-button>
          <a-button v-if="auth.isAdmin && record.status === 'rectifying'" type="primary" danger @click="handleConfirm">
            确认完成
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-spin :spinning="loading">
      <a-card :bordered="false" v-if="record.id">
        <a-descriptions bordered :column="{ xs: 1, sm: 2 }" size="middle">
          <a-descriptions-item label="工作室">{{ record.studio_name }}</a-descriptions-item>
          <a-descriptions-item label="提交人">{{ record.submitter_name }}</a-descriptions-item>
          <a-descriptions-item label="消防安全">
            <a-tag :color="record.fire_safety ? 'green' : 'red'">{{ record.fire_safety ? '通过' : '不通过' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="用电安全">
            <a-tag :color="record.electrical_safety ? 'green' : 'red'">{{ record.electrical_safety ? '通过' : '不通过' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="设备安全">
            <a-tag :color="record.equipment_safety ? 'green' : 'red'">{{ record.equipment_safety ? '通过' : '不通过' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="环境安全">
            <a-tag :color="record.environment_safety ? 'green' : 'red'">{{ record.environment_safety ? '通过' : '不通过' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="INSPECTION_STATUS[record.status]?.color">
              {{ INSPECTION_STATUS[record.status]?.label }}
            </a-tag>
            <a-tag v-if="record.severity" color="error" style="margin-left: 4px">{{ record.severity }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ formatTime(record.submitted_at) }}</a-descriptions-item>
          <a-descriptions-item label="审核时间" v-if="record.audited_at">{{ formatTime(record.audited_at) }}</a-descriptions-item>
          <a-descriptions-item label="审核意见" :span="2" v-if="record.audit_comment">{{ record.audit_comment }}</a-descriptions-item>
          <a-descriptions-item label="整改说明" :span="2" v-if="record.rectify_description">{{ record.rectify_description }}</a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h4>现场照片</h4>
        <div style="margin-bottom: 16px">
          <template v-if="record.watermarked_photo_path">
            <a-image :src="record.watermarked_photo_path" :width="300" style="border-radius: 4px" />
          </template>
          <template v-else-if="record.photo_path">
            <a-image :src="record.photo_path" :width="300" style="border-radius: 4px" />
          </template>
          <a-empty v-else description="暂无照片" />
        </div>

        <template v-if="rectifyPhotos.length">
          <h4>整改照片</h4>
          <PhotoViewer :photos="rectifyPhotos" />
        </template>

        <a-steps :current="stepIndex" style="margin-top: 32px" size="small">
          <a-step title="已提交" />
          <a-step :title="record.status === 'approved' ? '已通过' : '已审核'" />
          <a-step title="整改" v-if="record.status !== 'approved'" />
          <a-step title="已完成" />
        </a-steps>
      </a-card>
    </a-spin>

    <a-modal v-model:visible="auditVisible" title="审核检查记录" @ok="handleAudit" :confirmLoading="auditLoading">
      <a-form :model="auditForm" layout="vertical">
        <a-form-item label="审核结果" required>
          <a-radio-group v-model:value="auditForm.status">
            <a-radio value="approved">通过</a-radio>
            <a-radio value="needs_rectify">需整改</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="严重程度" v-if="auditForm.status === 'needs_rectify'">
          <a-select v-model:value="auditForm.severity" placeholder="请选择">
            <a-select-option v-for="s in SEVERITY_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="审核意见">
          <a-textarea v-model:value="auditForm.audit_comment" :rows="3" placeholder="审核意见（可选）" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="rectifyVisible" title="提交整改材料" @ok="handleRectify" :confirmLoading="rectifyLoading" width="520">
      <a-form layout="vertical">
        <a-form-item label="整改说明">
          <a-textarea v-model:value="rectifyForm.description" :rows="3" placeholder="整改说明" />
        </a-form-item>
        <a-form-item label="整改照片">
          <PhotoUploader ref="rectifyPhotoRef" v-model="rectifyPhotoList" :maxCount="9" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getInspections, auditInspection, rectifyInspection, confirmInspection } from '../api/inspections'
import { useAuthStore } from '../store/auth'
import { INSPECTION_STATUS, SEVERITY_OPTIONS, formatTime } from '../utils/constants'
import PhotoUploader from '../components/PhotoUploader.vue'
import PhotoViewer from '../components/PhotoViewer.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const record = ref({})
const auditVisible = ref(false)
const auditLoading = ref(false)
const rectifyVisible = ref(false)
const rectifyLoading = ref(false)
const rectifyPhotoRef = ref()
const rectifyPhotoList = ref([])

const auditForm = reactive({ status: 'approved', severity: undefined, audit_comment: '' })
const rectifyForm = reactive({ description: '' })

const rectifyPhotos = computed(() => {
  if (!record.value.rectify_photos) return []
  try {
    const arr = typeof record.value.rectify_photos === 'string'
      ? JSON.parse(record.value.rectify_photos)
      : record.value.rectify_photos
    return arr.filter(Boolean)
  } catch { return [] }
})

const stepIndex = computed(() => {
  const s = record.value.status
  if (s === 'pending') return 0
  if (s === 'approved') return 3
  if (s === 'needs_rectify') return 1
  if (s === 'rectifying') return 2
  if (s === 'completed') return 3
  return 0
})

async function fetchRecord() {
  loading.value = true
  try {
    const res = await getInspections({ pageSize: 1 })
    const found = res.data.list.find(item => item.id === parseInt(route.params.id))
    if (!found) {
      const allRes = await getInspections({ pageSize: 200 })
      record.value = allRes.data.list.find(item => item.id === parseInt(route.params.id)) || {}
    } else {
      record.value = found
    }
  } finally {
    loading.value = false
  }
}

async function handleAudit() {
  auditLoading.value = true
  try {
    await auditInspection(record.value.id, {
      status: auditForm.status,
      severity: auditForm.severity,
      audit_comment: auditForm.audit_comment
    })
    message.success('审核完成')
    auditVisible.value = false
    fetchRecord()
  } catch { /* ignore */ } finally {
    auditLoading.value = false
  }
}

async function handleRectify() {
  rectifyLoading.value = true
  try {
    const fd = new FormData()
    fd.append('rectify_description', rectifyForm.description)
    const files = rectifyPhotoRef.value?.getFiles()
    if (files && files.length > 0) {
      files.forEach(f => fd.append('rectify_photos', f))
    }
    await rectifyInspection(record.value.id, fd)
    message.success('整改材料提交成功')
    rectifyVisible.value = false
    fetchRecord()
  } catch { /* ignore */ } finally {
    rectifyLoading.value = false
  }
}

async function handleConfirm() {
  try {
    await confirmInspection(record.value.id)
    message.success('确认完成')
    fetchRecord()
  } catch { /* ignore */ }
}

onMounted(fetchRecord)
</script>

<style scoped>
.page-title { margin-bottom: 16px; }
.check-item { margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
</style>
