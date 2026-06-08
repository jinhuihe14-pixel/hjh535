import React, { useState } from 'react'
import { Layout, Menu, Badge } from 'antd'
import {
  DashboardOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
  ShoppingOutlined,
  BugOutlined,
  SettingOutlined,
  BellOutlined,
  SafetyOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  AlertOutlined,
} from '@ant-design/icons'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RealTimeDetection from './pages/RealTimeDetection'
import History from './pages/History'
import ProductManagement from './pages/ProductManagement'
import DefectTypeManagement from './pages/DefectTypeManagement'
import SystemSettings from './pages/SystemSettings'
import ReportAnalysis from './pages/ReportAnalysis'
import ModelTuning from './pages/ModelTuning'
import BatchAlert from './pages/BatchAlert'
import { alertApi } from './services/api'
import type { Alert } from './types'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/realtime', icon: <VideoCameraOutlined />, label: '实时检测' },
  {
    key: 'analysis',
    icon: <BarChartOutlined />,
    label: '数据分析',
    children: [
      { key: '/reports', icon: <BarChartOutlined />, label: '报表分析' },
      { key: '/history', icon: <HistoryOutlined />, label: '检测记录' },
    ],
  },
  {
    key: 'model',
    icon: <ExperimentOutlined />,
    label: '模型运维',
    children: [
      { key: '/model-tuning', icon: <ExperimentOutlined />, label: '模型调优' },
      { key: '/defect-types', icon: <BugOutlined />, label: '缺陷类型' },
    ],
  },
  {
    key: 'alert',
    icon: <AlertOutlined />,
    label: '预警中心',
    children: [
      { key: '/batch-alert', icon: <AlertOutlined />, label: '批量异常预警' },
    ],
  },
  { key: '/products', icon: <ShoppingOutlined />, label: '产品管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

const AppContent: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  React.useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alerts = await alertApi.getList({ is_read: false, limit: 100 })
        setUnreadCount(alerts.length)
      } catch (e) {
        console.error(e)
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <SafetyOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
          <span>产品外观缺陷智能检测系统</span>
        </div>
        <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Badge count={unreadCount} size="small">
            <BellOutlined style={{ fontSize: '20px', color: 'white', cursor: 'pointer' }} />
          </Badge>
          <span>管理员</span>
        </div>
      </Header>
      <Layout>
        <Sider
          width={220}
          theme="dark"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/realtime" element={<RealTimeDetection />} />
            <Route path="/reports" element={<ReportAnalysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/model-tuning" element={<ModelTuning />} />
            <Route path="/batch-alert" element={<BatchAlert />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/defect-types" element={<DefectTypeManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
