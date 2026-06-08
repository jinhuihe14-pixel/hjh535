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
  Switch,
  InputNumber,
  Radio,
  Divider,
} from 'antd'
import { EditOutlined, ReloadOutlined, WarningOutlined, BellOutlined } from '@ant-design/icons'
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

  const [batchWarningEnabled, setBatchWarningEnabled] = useState(true)
  const [batchWarningThreshold, setBatchWarningThreshold] = useState(5)
  const [batchWarningMethod, setBatchWarningMethod] = useState('popup')
  const [savingWarning, setSavingWarning] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cfgList, lineList] = await Promise.all([
        systemConfigApi.getList(),
        productionLineApi.getList(),
      ])
      setConfigs(cfgList)
      setLines(lineList)

      const configMap: Record<string, SystemConfig> = {}
      cfgList.forEach((c) => {
        configMap[c.config_key] = c
      })
      setBatchWarningEnabled(configMap['batch_warning_enabled']?.config_value !== 'false')
      setBatchWarningThreshold(parseInt(configMap['batch_warning_threshold']?.config_value || '5', 10))
      setBatchWarningMethod(configMap['batch_warning_method']?.config_value || 'popup')
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

  const handleSaveBatchWarning = async () => {
    setSavingWarning(true)
    try {
      await Promise.all([
        systemConfigApi.update(
          'batch_warning_enabled',
          batchWarningEnabled ? 'true' : 'false',
          '是否启用批量异常预警'
        ),
        systemConfigApi.update(
          'batch_warning_threshold',
          String(batchWarningThreshold),
          '批量预警阈值（连续N件同类缺陷触发）'
        ),
        systemConfigApi.update(
          'batch_warning_method',
          batchWarningMethod,
          '预警方式：popup-页面弹窗，sound-声音提醒，both-两者都有'
        ),
      ])
      message.success('保存成功，配置已立即生效')
      loadData()
    } catch (e) {
      console.error(e)
      message.error('保存失败')
    } finally {
      setSavingWarning(false)
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

  const getWarningMethodText = (method: string) => {
    const map: Record<string, string> = {
      popup: '页面弹窗',
      sound: '声音提醒',
      both: '弹窗+声音',
    }
    return map[method] || method
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
        <Tabs defaultActiveKey="warning">
          <TabPane tab="预警设置" key="warning">
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      批量异常预警
                    </Space>
                  }
                  size="small"
                  extra={
                    <Switch
                      checked={batchWarningEnabled}
                      onChange={setBatchWarningEnabled}
                      checkedChildren="启用"
                      unCheckedChildren="关闭"
                    />
                  }
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>
                        <BellOutlined style={{ marginRight: 8 }} />
                        预警阈值
                      </div>
                      <div style={{ paddingLeft: 24 }}>
                        <Space>
                          <span>连续</span>
                          <InputNumber
                            min={1}
                            max={100}
                            value={batchWarningThreshold}
                            onChange={(value) => setBatchWarningThreshold(value || 5)}
                            disabled={!batchWarningEnabled}
                            style={{ width: 100 }}
                          />
                          <span>件同类缺陷触发预警</span>
                        </Space>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                          当连续检测到N件同一类型缺陷时，自动触发预警
                        </div>
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ marginBottom: 8, fontWeight: 500 }}>
                        <BellOutlined style={{ marginRight: 8 }} />
                        预警方式
                      </div>
                      <div style={{ paddingLeft: 24 }}>
                        <Radio.Group
                          value={batchWarningMethod}
                          onChange={(e) => setBatchWarningMethod(e.target.value)}
                          disabled={!batchWarningEnabled}
                        >
                          <Radio value="popup">页面弹窗</Radio>
                          <Radio value="sound">声音提醒</Radio>
                          <Radio value="both">弹窗+声音</Radio>
                        </Radio.Group>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                          当前预警方式：{getWarningMethodText(batchWarningMethod)}
                        </div>
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    <div style={{ textAlign: 'right' }}>
                      <Button
                        type="primary"
                        onClick={handleSaveBatchWarning}
                        loading={savingWarning}
                      >
                        保存配置
                      </Button>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <BellOutlined style={{ color: '#1890ff' }} />
                      预警说明
                    </Space>
                  }
                  size="small"
                >
                  <List
                    size="small"
                    dataSource={[
                      { title: '工作原理', content: '系统实时监控检测结果，当连续检测到指定数量的同类缺陷时，自动触发预警' },
                      { title: '预警阈值', content: `当前设置为连续 ${batchWarningThreshold} 件同类缺陷触发预警` },
                      { title: '预警方式', content: `当前使用 ${getWarningMethodText(batchWarningMethod)} 方式进行预警` },
                      { title: '生效范围', content: '所有产线的实时检测均受此配置影响，保存后立即生效' },
                      { title: '重置条件', content: '当检测到合格产品或不同类型缺陷时，连续计数会被重置' },
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.title}
                          description={item.content}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

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
