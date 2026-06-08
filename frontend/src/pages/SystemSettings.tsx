import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tabs,
  Tag,
  Row,
  Col,
  Statistic,
  List,
} from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { systemConfigApi, productionLineApi } from '../services/api'
import type { SystemConfig, ProductionLine } from '../types'
import dayjs from 'dayjs'

const { TabPane } = Tabs

const SystemSettings: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const [cfgList, lineList] = await Promise.all([
        systemConfigApi.getList(),
        productionLineApi.getList(),
      ])
      setConfigs(cfgList)
      setLines(lineList)
    } catch (e) {
      console.error(e)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (config: SystemConfig) => {
    setEditingConfig(config)
    form.setFieldsValue({
      config_value: config.config_value,
      description: config.description,
    })
    setEditModal(true)
  }

  const handleSubmit = async () => {
    if (!editingConfig) return
    try {
      const values = await form.validateFields()
      await systemConfigApi.update(
        editingConfig.config_key,
        values.config_value,
        values.description
      )
      message.success('更新成功')
      setEditModal(false)
      loadData()
    } catch (e: any) {
      if (e.errorFields) return
      message.error('操作失败')
    }
  }

  const handleLineControl = async (lineId: number, action: string) => {
    try {
      await productionLineApi.control(lineId, action)
      message.success('操作成功')
      loadData()
    } catch (e: any) {
      message.error('操作失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const configColumns: ColumnsType<SystemConfig> = [
    {
      title: '配置项',
      dataIndex: 'config_key',
      key: 'config_key',
      width: 200,
    },
    {
      title: '配置值',
      dataIndex: 'config_value',
      key: 'config_value',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: SystemConfig) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ]

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      running: 'green',
      stopped: 'red',
      paused: 'orange',
      maintenance: 'default',
    }
    return map[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      running: '运行中',
      stopped: '已停止',
      paused: '已暂停',
      maintenance: '维护中',
    }
    return map[status] || status
  }

  return (
    <div>
      <Card
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        }
      >
        <Tabs defaultActiveKey="config">
          <TabPane tab="系统配置" key="config">
            <Table
              loading={loading}
              dataSource={configs}
              columns={configColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </TabPane>

          <TabPane tab="产线管理" key="lines">
            <Row gutter={16}>
              {lines.map((line) => (
                <Col span={8} key={line.id}>
                  <Card
                    size="small"
                    title={
                      <Space>
                        {line.line_name}
                        <Tag color={getStatusColor(line.status)}>
                          {getStatusText(line.status)}
                        </Tag>
                      </Space>
                    }
                    extra={
                      line.is_online ? (
                        <Tag color="green">在线</Tag>
                      ) : (
                        <Tag color="red">离线</Tag>
                      )
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Statistic
                      title="产线速度"
                      value={line.speed}
                      suffix="件/分钟"
                      style={{ marginBottom: 12 }}
                    />
                    <div style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
                      PLC地址: {line.plc_address || '-'}
                    </div>
                    <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
                      最后心跳: {dayjs(line.last_heartbeat).format('MM-DD HH:mm:ss')}
                    </div>
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        disabled={line.status === 'running'}
                        onClick={() => handleLineControl(line.id, 'start')}
                      >
                        启动
                      </Button>
                      <Button
                        size="small"
                        disabled={line.status !== 'running'}
                        onClick={() => handleLineControl(line.id, 'pause')}
                      >
                        暂停
                      </Button>
                      <Button
                        size="small"
                        danger
                        disabled={line.status === 'stopped'}
                        onClick={() => handleLineControl(line.id, 'stop')}
                      >
                        停止
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>

          <TabPane tab="关于系统" key="about">
            <Card size="small">
              <List
                size="large"
                dataSource={[
                  { title: '系统名称', content: '产品外观缺陷智能检测系统' },
                  { title: '系统版本', content: 'v1.0.0' },
                  { title: '技术架构', content: 'FastAPI + React + SQLAlchemy + SQLite' },
                  { title: '检测算法', content: '深度学习目标检测 (模拟实现)' },
                  {
                    title: '支持缺陷类型',
                    content:
                      '划痕、凹坑、污渍、色差、缺料、变形、毛刺、裂纹、气泡、异物等十余种',
                  },
                  { title: '部署方式', content: '支持本地部署、云端部署' },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.title} description={item.content} />
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="编辑配置"
        open={editModal}
        onOk={handleSubmit}
        onCancel={() => setEditModal(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="配置键名">
            <Input value={editingConfig?.config_key} disabled />
          </Form.Item>
          <Form.Item
            name="config_value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <Input placeholder="请输入配置值" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="请输入配置说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SystemSettings
