<template>
  <div class="studio-profile">
    <h3 class="page-title">工作室档案</h3>

    <a-alert
      v-if="pendingRectifyCount > 0"
      type="warning"
      show-icon
      :message="`您有 ${pendingRectifyCount} 项整改任务待处理`"
      style="margin-bottom: 16px"
    >
      <template #action>
        <a-button type="primary" size="small" @click="$router.push('/rectify')">
          立即处理
        </a-button>
      </template>
    </a-alert>

    <a-card :bordered="false" :loading="loading">
      <a-empty v-if="!profile.name" description="暂无档案数据" />
      <template v-else>
        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered size="middle" title="基础信息">
          <a-descriptions-item label="工作室名称">{{ profile.name }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ profile.manager_name }}</a-descriptions-item>
          <a-descriptions-item label="场地位置">{{ profile.location || '未填写' }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="profile.status === 'active' ? 'green' : 'red'">
              {{ profile.status === 'active' ? '正常' : '暂停使用' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered size="middle" title="联系信息">
          <a-descriptions-item label="联系方式">
            <template v-if="editingContact">
              <a-input v-model:value="editForm.phone" style="width: 200px" />
              <a-button type="link" size="small" @click="saveContact" :loading="saving">保存</a-button>
              <a-button type="link" size="small" @click="editingContact = false">取消</a-button>
            </template>
            <template v-else>
              {{ profile.phone || '未填写' }}
              <a-button type="link" size="small" @click="startEditContact">编辑</a-button>
            </template>
          </a-descriptions-item>
          <a-descriptions-item label="所属学院/部门">
            <template v-if="editingDept">
              <a-input v-model:value="editForm.department" style="width: 200px" />
              <a-button type="link" size="small" @click="saveContact" :loading="saving">保存</a-button>
              <a-button type="link" size="small" @click="editingDept = false">取消</a-button>
            </template>
            <template v-else>
              {{ profile.department || '未填写' }}
              <a-button type="link" size="small" @click="startEditDept">编辑</a-button>
            </template>
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <a-card title="工作室成员" size="small" :bordered="false">
          <template #extra>
            <a-button type="dashed" size="small" @click="showAddMember">
              <PlusOutlined /> 添加成员
            </a-button>
          </template>
          <a-table :columns="memberColumns" :data-source="members" :pagination="false" row-key="id" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-popconfirm title="确定移除此成员？" @confirm="removeMember(record.id)">
                  <a-button type="link" size="small" danger>移除</a-button>
                </a-popconfirm>
              </template>
            </template>
            <template #empty>
              <a-empty description="暂无成员" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </template>
          </a-table>
        </a-card>
      </template>
    </a-card>

    <a-modal v-model:open="addMemberVisible" title="添加成员" @ok="handleAddMember" :confirmLoading="saving">
      <a-form layout="vertical">
        <a-form-item label="成员姓名" required>
          <a-input v-model:value="newMember.name" placeholder="请输入成员姓名" />
        </a-form-item>
        <a-form-item label="学号/工号">
          <a-input v-model:value="newMember.student_id" placeholder="选填" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model:value="newMember.role" placeholder="选填" allowClear>
            <a-select-option value="成员">成员</a-select-option>
            <a-select-option value="组长">组长</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Empty } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '../store/auth'
import { getInspections } from '../api/inspections'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const editingContact = ref(false)
const editingDept = ref(false)
const addMemberVisible = ref(false)

const pendingRectifyCount = ref(0)

const profile = reactive({
  name: auth.user?.studio_name || '',
  manager_name: auth.user?.real_name || '',
  location: '',
  status: 'active',
  phone: '',
  department: ''
})

const editForm = reactive({ phone: '', department: '' })
const members = ref([])
const newMember = reactive({ name: '', student_id: '', role: '成员' })

const memberColumns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '学号/工号', dataIndex: 'student_id' },
  { title: '角色', dataIndex: 'role' },
  { title: '操作', key: 'action', width: 80 }
]

function startEditContact() {
  editForm.phone = profile.phone
  editingContact.value = true
  editingDept.value = false
}
function startEditDept() {
  editForm.department = profile.department
  editingDept.value = true
  editingContact.value = false
}

async function saveContact() {
  saving.value = true
  try {
    // TODO: call API when backend is ready
    profile.phone = editForm.phone
    profile.department = editForm.department
    editingContact.value = false
    editingDept.value = false
    message.success('保存成功')
  } catch {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

function showAddMember() { addMemberVisible.value = true }
function handleAddMember() {
  if (!newMember.name) { message.warning('请输入成员姓名'); return }
  members.value.push({ id: Date.now(), ...newMember })
  newMember.name = ''
  newMember.student_id = ''
  newMember.role = '成员'
  addMemberVisible.value = false
  message.success('成员已添加')
}
function removeMember(id) {
  members.value = members.value.filter(m => m.id !== id)
  message.success('成员已移除')
}

async function checkPendingRectify() {
  try {
    const res = await getInspections({ pageSize: 500 })
    const myStudio = auth.user?.studio_name || ''
    pendingRectifyCount.value = (res.data.list || []).filter(
      i => i.studio_name === myStudio && (i.status === 'needs_rectify' || i.status === 'rectifying')
    ).length
  } catch { /* ignore */ }
}

onMounted(checkPendingRectify)
</script>

<style scoped>
.page-title { margin-bottom: 24px; }
</style>
