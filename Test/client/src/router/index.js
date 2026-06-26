import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    redirect: (to) => {
      const token = localStorage.getItem('token')
      if (!token) return '/login'
      // 角色由守卫中 fetchUserInfo 后再决定，先给默认
      return '/inspections'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '工作台', roles: ['admin'] }
  },
  {
    path: '/profile',
    name: 'StudioProfile',
    component: () => import('../views/StudioProfileView.vue'),
    meta: { title: '工作室档案', roles: ['manager'] }
  },
  {
    path: '/rectify',
    name: 'Rectify',
    component: () => import('../views/RectifyView.vue'),
    meta: { title: '我的整改任务', roles: ['manager'] }
  },
  {
    path: '/inspections',
    name: 'InspectionList',
    component: () => import('../views/InspectionList.vue'),
    meta: { title: '检查记录' }
  },
  {
    path: '/inspections/submit',
    name: 'InspectionForm',
    component: () => import('../views/InspectionForm.vue'),
    meta: { title: '提交检查', roles: ['inspector'] }
  },
  {
    path: '/inspections/:id',
    name: 'InspectionDetail',
    component: () => import('../views/InspectionDetail.vue'),
    meta: { title: '检查详情' }
  },
  {
    path: '/studios',
    name: 'StudioList',
    component: () => import('../views/StudioList.vue'),
    meta: { title: '工作室管理', roles: ['admin'] }
  },
  {
    path: '/studios/create',
    name: 'StudioFormCreate',
    component: () => import('../views/StudioForm.vue'),
    meta: { title: '新增工作室', roles: ['admin'] }
  },
  {
    path: '/studios/:id/edit',
    name: 'StudioFormEdit',
    component: () => import('../views/StudioForm.vue'),
    meta: { title: '编辑工作室', roles: ['admin'] }
  },
  {
    path: '/ranking',
    name: 'Ranking',
    component: () => import('../views/RankingView.vue'),
    meta: { title: '检查排名', roles: ['admin', 'inspector'] }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/ReportView.vue'),
    meta: { title: '统计报表', roles: ['admin', 'inspector'] }
  },
  {
    path: '/unchecked',
    name: 'Unchecked',
    component: () => import('../views/UncheckedView.vue'),
    meta: { title: '未检查名单', roles: ['admin', 'inspector'] }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/NotificationView.vue'),
    meta: { title: '通知消息' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '系统设置' }
  }
]

const ROLE_DEFAULT_PATH = {
  admin: '/dashboard',
  manager: '/profile',
  inspector: '/inspections'
}

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.public) {
    return next()
  }

  const authStore = useAuthStore()
  const token = localStorage.getItem('token')

  if (!token) {
    return next('/login')
  }

  if (!authStore.user) {
    try {
      await authStore.fetchUserInfo()
    } catch {
      authStore.logout()
      return next('/login')
    }
  }

  const role = authStore.role

  if (to.meta.roles && !to.meta.roles.includes(role)) {
    return next(ROLE_DEFAULT_PATH[role] || '/inspections')
  }

  if (to.path === '/' || to.path === '') {
    return next(ROLE_DEFAULT_PATH[role] || '/inspections')
  }

  next()
})

export default router
