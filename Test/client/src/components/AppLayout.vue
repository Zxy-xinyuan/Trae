<template>
  <a-layout class="app-shell">
    <aside :class="['sidebar', { collapsed }]">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <SafetyCertificateOutlined />
        </div>
        <transition name="fade">
          <div v-if="!collapsed" class="brand-info">
            <span class="brand-name">安全检查管理系统</span>
            <span class="brand-sub">Safety Inspection System</span>
          </div>
        </transition>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section" v-if="auth.isAdmin">
          <div class="nav-section-title" v-if="!collapsed">常用功能</div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="inline"
            :inline-collapsed="collapsed"
            @click="onMenuClick"
            class="sidebar-menu"
          >
            <a-menu-item key="/dashboard">
              <template #icon><HomeOutlined /></template>
              <span>工作台</span>
            </a-menu-item>
            <a-menu-item key="/studios">
              <template #icon><ApartmentOutlined /></template>
              <span>工作室管理</span>
            </a-menu-item>
          </a-menu>
        </div>

        <div class="nav-section" v-if="auth.isManager">
          <div class="nav-section-title" v-if="!collapsed">我的工作室</div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="inline"
            :inline-collapsed="collapsed"
            @click="onMenuClick"
            class="sidebar-menu"
          >
            <a-menu-item key="/profile">
              <template #icon><IdcardOutlined /></template>
              <span>工作室档案</span>
            </a-menu-item>
            <a-menu-item key="/rectify">
              <template #icon><AlertOutlined /></template>
              <span>我的整改</span>
            </a-menu-item>
          </a-menu>
        </div>

        <div class="nav-section">
          <div class="nav-section-title" v-if="!collapsed">检查工作</div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="inline"
            :inline-collapsed="collapsed"
            @click="onMenuClick"
            class="sidebar-menu"
          >
            <a-menu-item key="/inspections">
              <template #icon><FileSearchOutlined /></template>
              <span>检查记录</span>
            </a-menu-item>
            <a-menu-item key="/inspections/submit" v-if="auth.isInspector">
              <template #icon><FormOutlined /></template>
              <span>提交检查</span>
            </a-menu-item>
          </a-menu>
        </div>

        <div class="nav-section" v-if="auth.isAdmin || auth.isInspector">
          <div class="nav-section-title" v-if="!collapsed">数据统计</div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="inline"
            :inline-collapsed="collapsed"
            @click="onMenuClick"
            class="sidebar-menu"
          >
            <a-menu-item key="/ranking"><template #icon><TrophyOutlined /></template><span>检查排名</span></a-menu-item>
            <a-menu-item key="/report"><template #icon><BarChartOutlined /></template><span>统计报表</span></a-menu-item>
            <a-menu-item key="/unchecked"><template #icon><ExclamationCircleOutlined /></template><span>未检查名单</span></a-menu-item>
          </a-menu>
        </div>
      </nav>

      <div class="sidebar-footer">
        <a-menu mode="inline" :inline-collapsed="collapsed" class="sidebar-menu" v-model:selectedKeys="bottomKeys" @click="onMenuClick">
          <a-menu-item key="/notifications">
            <template #icon>
              <a-badge :count="notifStore.unreadCount" :overflow-count="99" :number-style="{ fontSize: '10px', height: '16px', lineHeight: '16px', minWidth: '16px' }">
                <BellOutlined />
              </a-badge>
            </template>
            <span>通知消息</span>
          </a-menu-item>
          <a-menu-item key="/settings">
            <template #icon><SettingOutlined /></template>
            <span>系统设置</span>
          </a-menu-item>
        </a-menu>
        <div class="sidebar-user" :class="{ collapsed }">
          <a-avatar :size="collapsed ? 32 : 36" :style="{ backgroundColor: '#2C6E9E' }">
            {{ auth.user?.real_name?.charAt(0) || 'U' }}
          </a-avatar>
          <transition name="fade">
            <div v-if="!collapsed" class="user-detail">
              <span class="user-name">{{ auth.user?.real_name || auth.user?.username }}</span>
              <span class="user-role">{{ roleLabel }}</span>
            </div>
          </transition>
          <LogoutOutlined v-if="!collapsed" class="logout-btn" @click="handleLogout" title="退出登录" />
        </div>
      </div>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <a-button type="text" class="collapse-trigger" @click="collapsed = !collapsed">
            <MenuFoldOutlined v-if="!collapsed" />
            <MenuUnfoldOutlined v-else />
          </a-button>
          <nav class="breadcrumb">
            <HomeOutlined class="breadcrumb-home" @click="$router.push(auth.isAdmin ? '/dashboard' : auth.isManager ? '/profile' : '/inspections')" />
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">{{ pageTitle }}</span>
          </nav>
        </div>
        <div class="topbar-right">
          <div class="header-search">
            <SearchOutlined class="search-icon" />
            <input type="text" placeholder="搜索..." v-model="searchText" class="search-input" />
          </div>
          <a-badge :count="notifStore.unreadCount" :overflow-count="99" :number-style="{ fontSize: '10px' }">
            <BellOutlined class="topbar-icon" @click="$router.push('/notifications')" />
          </a-badge>
          <a-dropdown trigger="['click']">
            <a-avatar :size="32" :style="{ backgroundColor: '#2C6E9E', cursor: 'pointer' }">
              {{ auth.user?.real_name?.charAt(0) || 'U' }}
            </a-avatar>
            <template #overlay>
              <div class="user-dropdown">
                <div class="dropdown-header">
                  <a-avatar :size="40" :style="{ backgroundColor: '#2C6E9E' }">
                    {{ auth.user?.real_name?.charAt(0) || 'U' }}
                  </a-avatar>
                  <div>
                    <div class="dropdown-name">{{ auth.user?.real_name || auth.user?.username }}</div>
                    <div class="dropdown-role">{{ roleLabel }}</div>
                  </div>
                </div>
                <a-divider style="margin: 8px 0" />
                <div class="dropdown-item" @click="$router.push('/settings')"><SettingOutlined /> 系统设置</div>
                <div class="dropdown-item logout" @click="handleLogout"><LogoutOutlined /> 退出登录</div>
              </div>
            </template>
          </a-dropdown>
        </div>
      </header>

      <main class="content-area">
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </section>
  </a-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeOutlined, FileSearchOutlined, FormOutlined, ApartmentOutlined,
  BarChartOutlined, BellOutlined, SettingOutlined, SafetyCertificateOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, IdcardOutlined, AlertOutlined,
  SearchOutlined, TrophyOutlined, ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '../store/auth'
import { useNotificationStore } from '../store/notification'
import { ROLE_MAP } from '../utils/constants'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const notifStore = useNotificationStore()

const collapsed = ref(false)
const selectedKeys = ref([route.path || '/inspections'])
const bottomKeys = ref([])
const searchText = ref('')

const roleLabel = computed(() => ROLE_MAP[auth.role]?.label || '')
const pageTitle = computed(() => route.meta.title || '')

watch(() => route.path, (path) => {
  selectedKeys.value = [path]
})

onMounted(() => {
  selectedKeys.value = [route.path]
  notifStore.fetchNotifications({ is_read: '0', pageSize: 1 })
})

function onMenuClick({ key }) {
  router.push(key)
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-page);
}

/* ====== Sidebar ====== */
.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-slow);
  overflow: hidden;
  z-index: 100;
}
.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-brand {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-3);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  min-height: var(--header-height);
}
.brand-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-300));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  flex-shrink: 0;
}
.brand-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.brand-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: #fff;
  white-space: nowrap;
  line-height: 1.3;
}
.brand-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  font-weight: var(--weight-normal);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ====== Sidebar Nav ====== */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-2) 0;
}
.nav-section {
  margin-bottom: var(--space-1);
}
.nav-section-title {
  padding: var(--space-3) var(--space-5) var(--space-1);
  font-size: 10px;
  font-weight: var(--weight-semibold);
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.sidebar-menu {
  background: transparent !important;
  border: none !important;
}
.sidebar-menu :deep(.ant-menu-item) {
  height: 40px !important;
  line-height: 40px !important;
  margin: 1px 8px !important;
  padding: 0 12px !important;
  border-radius: var(--radius-md) !important;
  color: rgba(255,255,255,0.6) !important;
  font-size: var(--text-sm) !important;
  transition: all var(--transition-fast) !important;
}
.sidebar-menu :deep(.ant-menu-item:hover) {
  color: rgba(255,255,255,0.9) !important;
  background: rgba(255,255,255,0.06) !important;
}
.sidebar-menu :deep(.ant-menu-item-selected) {
  color: #fff !important;
  background: rgba(44,110,158,0.35) !important;
}
.sidebar-menu :deep(.ant-menu-item .anticon) {
  font-size: 18px !important;
}
.sidebar-menu :deep(.ant-menu-item .anticon + span) {
  margin-inline-start: 12px !important;
}
.sidebar-menu :deep(.ant-menu-inline-collapsed) {
  width: var(--sidebar-collapsed) !important;
}
.sidebar-menu :deep(.ant-menu-inline-collapsed .ant-menu-item) {
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ====== Sidebar Footer ====== */
.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: var(--space-2) 0;
}
.sidebar-user {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  gap: var(--space-2);
  transition: padding var(--transition-slow);
}
.sidebar-user.collapsed {
  justify-content: center;
  padding: var(--space-2);
}
.user-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
}
.logout-btn {
  font-size: 14px;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.logout-btn:hover { color: var(--accent-red); }

/* ====== Main Area ====== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ====== Topbar ====== */
.topbar {
  height: var(--header-height);
  background: var(--bg-header);
  border-bottom: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-5);
  z-index: 50;
  min-height: var(--header-height);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.collapse-trigger {
  font-size: 18px;
  color: var(--gray-500);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.collapse-trigger:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--gray-400);
}
.breadcrumb-home {
  color: var(--gray-400);
  cursor: pointer;
  font-size: 14px;
  transition: color var(--transition-fast);
}
.breadcrumb-home:hover { color: var(--accent-blue); }
.breadcrumb-sep { color: var(--gray-300); }
.breadcrumb-current {
  color: var(--gray-700);
  font-weight: var(--weight-medium);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.header-search {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  font-size: 14px;
  color: var(--gray-400);
  pointer-events: none;
}
.search-input {
  width: 200px;
  height: 34px;
  padding: 0 var(--space-3) 0 32px;
  border: var(--border-input);
  border-radius: var(--radius-full);
  background: var(--gray-50);
  font-size: var(--text-sm);
  outline: none;
  transition: all var(--transition-fast);
  color: var(--gray-700);
}
.search-input::placeholder { color: var(--gray-400); }
.search-input:focus {
  border-color: var(--accent-blue);
  background: #fff;
  width: 240px;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}
.topbar-icon {
  font-size: 18px;
  color: var(--gray-500);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.topbar-icon:hover { color: var(--accent-blue); }

/* ====== User Dropdown ====== */
.user-dropdown {
  width: 220px;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3);
  overflow: hidden;
}
.dropdown-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) 0;
}
.dropdown-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--gray-800);
}
.dropdown-role {
  font-size: var(--text-xs);
  color: var(--gray-400);
}
.dropdown-item {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--gray-600);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}
.dropdown-item:hover {
  background: var(--gray-50);
  color: var(--gray-800);
}
.dropdown-item.logout {
  color: var(--accent-red);
}
.dropdown-item.logout:hover {
  background: #FEF2F2;
}

/* ====== Content ====== */
.content-area {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-page);
  display: flex;
  justify-content: center;
}
.content-wrapper {
  width: 100%;
  max-width: 1400px;
  padding: var(--space-6);
  box-sizing: border-box;
}

/* ====== Transitions ====== */
.fade-enter-active, .fade-leave-active {
  transition: opacity var(--transition-slow);
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

.page-fade-enter-active, .page-fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ====== Responsive ====== */
@media (max-width: 1279px) {
  .sidebar:not(.collapsed) { width: 200px; }
  .search-input { width: 160px; }
  .search-input:focus { width: 180px; }
  .content-wrapper { padding: var(--space-4); }
}

@media (max-width: 1023px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    z-index: 200;
    box-shadow: var(--shadow-xl);
    transform: translateX(0);
    transition: transform var(--transition-slow);
  }
  .sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width);
  }
  .content-wrapper { padding: var(--space-3); }
  .search-input { width: 120px; }
  .search-input:focus { width: 140px; }
}

@media (max-width: 767px) {
  .sidebar { width: var(--sidebar-width); }
  .sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width);
  }
  .topbar { padding: 0 var(--space-3); }
  .content-wrapper { padding: var(--space-3); }
  .header-search { display: none; }
  .breadcrumb .breadcrumb-sep,
  .breadcrumb .breadcrumb-home { display: none; }
}
</style>
