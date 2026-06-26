<template>
  <div class="camera-uploader">
    <div class="photos-grid">
      <div
        v-for="photo in photos"
        :key="photo.uid"
        class="photo-card"
        @click="previewPhoto(photo)"
      >
        <img :src="photo.url" class="photo-thumb" alt="照片" />
        <div class="photo-overlay" @click.stop="removePhoto(photo.uid)">
          <CloseCircleFilled />
        </div>
      </div>
      <div
        v-if="photos.length < maxCount"
        class="photo-card add-card"
        @click="openCamera"
      >
        <CameraOutlined class="add-icon" />
        <span class="add-text">{{ photos.length === 0 ? '拍照上传' : '继续拍照' }}</span>
        <span class="add-hint">仅支持拍照</span>
      </div>
    </div>

    <a-modal
      v-model:open="cameraVisible"
      title="拍照上传"
      width="720px"
      :footer="null"
      :maskClosable="false"
      @cancel="closeCamera"
      class="camera-modal"
      wrap-class-name="camera-modal-wrap"
    >
      <a-alert
        type="warning"
        show-icon
        message="仅支持实时拍照上传，不支持从相册或本地文件系统选择图片"
        style="margin-bottom: 12px"
      />

      <div class="camera-area" v-if="!capturedImage">
        <video ref="videoRef" autoplay playsinline muted class="camera-video"></video>
        <div class="camera-placeholder" v-if="cameraError">
          <ExclamationCircleOutlined class="error-icon" />
          <p>{{ cameraError }}</p>
          <a-button @click="retryCamera">重试</a-button>
        </div>
        <div class="camera-controls" v-if="!cameraError">
          <a-button size="large" shape="circle" class="capture-btn" @click="capturePhoto">
            <template #icon><CameraOutlined /></template>
          </a-button>
          <a-button
            size="small"
            shape="circle"
            class="switch-btn"
            @click="switchCamera"
            v-if="hasMultipleCameras"
          >
            <template #icon><SwapOutlined /></template>
          </a-button>
        </div>
      </div>

      <div class="preview-area" v-else>
        <img :src="capturedImage" class="captured-preview" alt="拍照预览" />
        <div class="preview-controls">
          <a-space size="large">
            <a-button size="large" @click="retakePhoto">
              <template #icon><ReloadOutlined /></template>
              重拍
            </a-button>
            <a-button type="primary" size="large" @click="confirmPhoto">
              <template #icon><CheckOutlined /></template>
              使用照片
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>

    <a-modal :open="previewVisible" :footer="null" @cancel="previewVisible = false">
      <img :src="previewUrl" style="width: 100%" alt="预览" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  CameraOutlined, CloseCircleFilled, ExclamationCircleOutlined,
  ReloadOutlined, CheckOutlined, SwapOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 1 }
})

const emit = defineEmits(['update:modelValue'])

const photos = ref([])
const previewVisible = ref(false)
const previewUrl = ref('')
const cameraVisible = ref(false)
const cameraError = ref('')
const capturedImage = ref('')
const hasMultipleCameras = ref(false)

const videoRef = ref(null)
let mediaStream = null
let currentFacingMode = 'environment'

watch(() => props.modelValue, (val) => {
  if (Array.isArray(val) && val.length > 0) {
    photos.value = val.map((v, i) => ({
      uid: v.uid || String(Date.now() + i),
      name: v.name || `photo_${i}`,
      url: v.url || v,
      file: v.originFileObj || v.file || null
    }))
  }
}, { immediate: true })

function emitPhotos() {
  const data = photos.value.map(p => ({
    uid: p.uid,
    name: p.name,
    url: p.url,
    originFileObj: p.file
  }))
  emit('update:modelValue', data)
}

function previewPhoto(photo) {
  previewUrl.value = photo.url
  previewVisible.value = true
}

function removePhoto(uid) {
  photos.value = photos.value.filter(p => p.uid !== uid)
  emitPhotos()
}

async function openCamera() {
  cameraError.value = ''
  capturedImage.value = ''
  cameraVisible.value = true
  await nextTick()
  await startCamera()
}

async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    }
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      await videoRef.value.play()
    }
    await detectCameras()
  } catch (err) {
    console.error('Camera error:', err)
    if (err.name === 'NotAllowedError') {
      cameraError.value = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头后重试'
    } else if (err.name === 'NotFoundError') {
      cameraError.value = '未检测到摄像头设备，请连接摄像头后重试'
    } else if (err.name === 'NotReadableError') {
      cameraError.value = '摄像头被其他应用占用，请关闭其他使用摄像头的程序后重试'
    } else {
      cameraError.value = '无法打开摄像头：' + (err.message || '未知错误')
    }
  }
}

async function detectCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    hasMultipleCameras.value = videoDevices.length > 1
  } catch {
    hasMultipleCameras.value = false
  }
}

async function switchCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment'
  stopMediaStream()
  await nextTick()
  await startCamera()
}

function stopMediaStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
}

function capturePhoto() {
  if (!videoRef.value) return

  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)

  capturedImage.value = canvas.toDataURL('image/jpeg', 0.85)
}

function retryCamera() {
  cameraError.value = ''
  startCamera()
}

function retakePhoto() {
  capturedImage.value = ''
}

async function confirmPhoto() {
  if (!capturedImage.value) return

  try {
    const file = await compressAndCreateFile(capturedImage.value, photos.value.length)
    photos.value.push({
      uid: String(Date.now()) + String(Math.random()).slice(2, 10),
      name: file.name,
      url: URL.createObjectURL(file),
      file
    })
    emitPhotos()

    capturedImage.value = ''
    cameraVisible.value = false
    stopMediaStream()

    message.success('照片已就绪')
  } catch (err) {
    message.error('照片处理失败，请重试')
  }
}

function compressAndCreateFile(dataURL, index) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const maxW = 1920
      const maxH = 1920
      let w = img.width
      let h = img.height

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob((blob) => {
        const file = new File([blob], `camera_${Date.now()}_${index}.jpg`, { type: 'image/jpeg' })
        resolve(file)
      }, 'image/jpeg', 0.85)
    }
    img.src = dataURL
  })
}

async function closeCamera() {
  stopMediaStream()
  capturedImage.value = ''
  cameraVisible.value = false
}

function getFiles() {
  return photos.value.map(p => p.file).filter(Boolean)
}

defineExpose({ getFiles })

onUnmounted(() => {
  stopMediaStream()
  photos.value.forEach(p => {
    if (p.url && p.url.startsWith('blob:')) {
      URL.revokeObjectURL(p.url)
    }
  })
})
</script>

<style scoped>
.camera-uploader {
  width: 100%;
}
.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.photo-card {
  width: 104px;
  height: 104px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.photo-card:hover {
  border-color: #1890ff;
}
.photo-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-overlay {
  position: absolute;
  top: -2px;
  right: -2px;
  color: #ff4d4f;
  font-size: 18px;
  background: #fff;
  border-radius: 50%;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.2s;
}
.photo-card:hover .photo-overlay {
  opacity: 1;
}
.add-card {
  background: #fafafa;
  border-style: dashed;
}
.add-icon {
  font-size: 28px;
  color: #1890ff;
  margin-bottom: 4px;
}
.add-text {
  font-size: 12px;
  color: #333;
}
.add-hint {
  font-size: 10px;
  color: #ff7a45;
  margin-top: 2px;
}
.camera-area {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.camera-video {
  width: 100%;
  display: block;
  background: #000;
}
.camera-placeholder {
  text-align: center;
  color: #999;
  padding: 60px 20px;
}
.error-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 12px;
}
.camera-controls {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}
.capture-btn {
  width: 60px;
  height: 60px;
  border: 3px solid #fff !important;
  background: rgba(255,255,255,0.3) !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.capture-btn:hover {
  background: rgba(255,255,255,0.5) !important;
}
.capture-btn :deep(.anticon) {
  font-size: 24px;
  color: #fff;
}
.switch-btn {
  border: 2px solid #fff !important;
  background: rgba(255,255,255,0.3) !important;
  color: #fff !important;
}
.preview-area {
  text-align: center;
}
.captured-preview {
  max-width: 100%;
  max-height: 480px;
  border-radius: 8px;
}
.preview-controls {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
<style>
.camera-modal-wrap .ant-modal-body {
  padding: 12px;
}
</style>
