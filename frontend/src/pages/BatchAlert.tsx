import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Tag,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Statistic,
  Drawer,
  Descriptions,
  List,
  Badge,
  Tooltip,
} from 'antd'
import {
  AlertOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BellOutlined,
  SoundOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { batchAlertApi, defectTypeApi } from '../services/api'
import type { BatchAlertConfig, BatchAlertRecord } from '../types'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { Option } = Select
const { TextArea } = Input

const BatchAlert: React.FC = () => {
  const [activeTab, setActiveTab] = useState('records')
  const [alertRecords, setAlertRecords] = useState<BatchAlertRecord[]>([])
  const [alertConfigs, setAlertConfigs] = useState<BatchAlertConfig[]>([])
  const [defectTypes, setDefectTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [configForm] = Form.useForm()
  const [editingConfig, setEditingConfig] = useState<BatchAlertConfig | null>(null)

  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<BatchAlertRecord | null>(null)

  const loadRecords = async () => {
    setLoading(true)
    try {
      const data = await batchAlertApi.getRecords({ limit: 100 })
      setAlertRecords(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadConfigs = async () => {
    try {
      const data = await batchAlertApi.getConfigs()
      setAlertConfigs(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadDefectTypes = async () => {
    try {
      const data = await defectTypeApi.getList({ is_active: true })
      setDefectTypes(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadRecords()
    loadConfigs()
    loadDefectTypes()
  }, [])

  const handleAddConfig = () => {
    setEditingConfig(null)
    configForm.resetFields()
    setConfigModalVisible(true)
  }

  const handleEditConfig = (config: BatchAlertConfig) => {
    setEditingConfig(config)
    configForm.setFieldsValue(config)
    setConfigModalVisible(true)
  }

  const handleSaveConfig = async (values: any) => {
    try {
      if (editingConfig) {
        await batchAlertApi.updateConfig(editingConfig.id, values)
        message.success('更新成功')
      } else {
        await batchAlertApi.createConfig(values)
        message.success('创建成功')
      }
      setConfigModalVisible(false)
      loadConfigs()
    } catch (e: any) {
      message.error('保存失败: ' + e.message)
    }
  }

  const handleDeleteConfig = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此预警配置吗？',
      onOk: async () => {
        try {
          await batchAlertApi.deleteConfig(id)
          message.success('删除成功')
          loadConfigs()
        } catch (e: any) {
          message.error('删除失败: ' + e.message)
        }
      },
    })
  }

  const handleResolve = async (id: number) => {
    Modal.confirm({
      title: '确认处理',
      content: '请确认已排查并处理该批量异常问题。',
      onOk: async () => {
        try {
          await batchAlertApi.resolve(id, '管理员', '已处理')
          message.success('处理成功')
          loadRecords()
        } catch (e: any) {
          message.error('处理失败: ' + e.message)
        }
      },
    })
  }

  const handleViewDetail = (record: BatchAlertRecord) => {
    setCurrentRecord(record)
    setDetailDrawerVisible(true)
  }

  const isResolved = (record: BatchAlertRecord) => record.status === 'resolved'

  const pendingCount = alertRecords.filter((r) => !isResolved(r)).length
  const todayCount = alertRecords.filter((r) =>
    dayjs(r.created_at).isSame(dayjs(), 'day')
  ).length
  const resolvedCount = alertRecords.filter((r) => isResolved(r)).length

  const recordColumns = [
    {
      title: '告警ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) =>
        status === 'resolved' ? (
          <Badge status="success" text="已处理" />
        ) : (
          <Badge status="warning" text="待处理" />
        ),
    },
    {
      title: '告警编码',
      dataIndex: 'alert_code',
      key: 'alert_code',
      width: 120,
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type_name',
      key: 'defect_type_name',
      render: (name: string, record: BatchAlertRecord) => (
        <Space>
          <Tag color="red">{name || '-'}</Tag>
          <Tag color="orange">{record.alert_level}</Tag>
        </Space>
      ),
    },
    {
      title: '产线',
      dataIndex: 'line_number',
      key: 'line_number',
      render: (line: string) => (
        <Space>
          <EnvironmentOutlined />
          <span>{line || '-'}</span>
        </Space>
      ),
    },
    {
      title: '缺陷数量',
      dataIndex: 'defect_count',
      key: 'defect_count',
      width: 100,
      render: (count: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{count} 件</span>
      ),
    },
    {
      title: '时间窗口',
      dataIndex: 'time_window_minutes',
      key: 'time_window_minutes',
      width: 100,
      render: (minutes: number) => `${minutes} 分钟`,
    },
    {
      title: '阈值',
      dataIndex: 'threshold_count',
      key: 'threshold_count',
      width: 80,
    },
    {
      title: '首次发现',
      dataIndex: 'first_seen_at',
      key: 'first_seen_at',
      width: 160,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: BatchAlertRecord) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {!isResolved(record) && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolve(record.id)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const configColumns = [
    { title: '配置名称', dataIndex: 'config_name', key: 'config_name' },
    {
      title: '适用范围',
      key: 'scope',
      render: (_: any, record: BatchAlertConfig) => (
        <Space direction="vertical" size={0}>
          <span>产线: {record.line_number || '全部'}</span>
          <span style={{ color: '#999', fontSize: 12 }}>
            缺陷: {record.defect_type_code || '全部'}
          </span>
        </Space>
      ),
    },
    {
      title: '判定规则',
      key: 'rule',
      render: (_: any, record: BatchAlertConfig) => (
        <span>
          连续 <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{record.threshold_count}</span>{' '}
          件同缺陷 · {record.time_window_minutes}分钟内
        </span>
      ),
    },
    {
      title: '告警方式',
      key: 'methods',
      render: (_: any, record: BatchAlertConfig) => (
        <Space>
          <Tag icon={<SoundOutlined />} color={record.sound_alert ? 'red' : 'default'}>
            声音
          </Tag>
          <Tag icon={<BellOutlined />} color={record.light_alert ? 'orange' : 'default'}>
            灯光
          </Tag>
          <Tag icon={<AlertOutlined />} color={record.notify_channels && record.notify_channels.length > 0 ? 'blue' : 'default'}>
            通知
          </Tag>
        </Space>
      ),
    },
    {
      title: '告警等级',
      dataIndex: 'alert_level',
      key: 'alert_level',
      width: 100,
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          critical: 'red',
          warning: 'orange',
          info: 'blue',
        }
        return <Tag color={colorMap[level] || 'default'}>{level}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: BatchAlertConfig) => (
        <Space>
          <Button size="small" onClick={() => handleEditConfig(record)}>
            编辑
          </Button>
          <Button size="small" danger onClick={() => handleDeleteConfig(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="批量异常预警"
      extra={
        <Space>
          <Badge count={pendingCount} offset={[-5, 2]}>
            <AlertOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
          </Badge>
          <span style={{ color: '#666' }}>待处理: {pendingCount} 条</span>
        </Space>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="今日告警"
              value={todayCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待处理"
              value={pendingCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已处理"
              value={resolvedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="预警规则数"
              value={alertConfigs.filter((c) => c.is_enabled).length}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <AlertOutlined /> 告警记录
            </span>
          }
          key="records"
        >
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Space>
              <Select
                defaultValue="all"
                style={{ width: 120 }}
                onChange={(v) => {
                  if (v === 'all') loadRecords()
                  else if (v === 'pending') {
                    setAlertRecords(alertRecords.filter((r) => !isResolved(r)))
                  } else {
                    setAlertRecords(alertRecords.filter((r) => isResolved(r)))
                  }
                }}
              >
                <Option value="all">全部</Option>
                <Option value="pending">待处理</Option>
                <Option value="resolved">已处理</Option>
              </Select>
            </Space>
          </div>

          <Table
            dataSource={alertRecords}
            columns={recordColumns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined /> 预警配置
            </span>
          }
          key="configs"
        >
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<SettingOutlined />} onClick={handleAddConfig}>
              新建预警规则
            </Button>
          </div>

          <Table
            dataSource={alertConfigs}
            columns={configColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      <Modal
        title={editingConfig ? '编辑预警规则' : '新建预警规则'}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
          <Form.Item
            name="config_name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：产线A划痕批量预警" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="line_number" label="产线">
                <Select placeholder="全部产线" allowClear>
                  <Option value="line_a">产线A</Option>
                  <Option value="line_b">产线B</Option>
                  <Option value="line_c">产线C</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="defect_type_code" label="缺陷类型">
                <Select placeholder="全部缺陷类型" allowClear>
                  {defectTypes.map((d) => (
                    <Option key={d.code} value={d.code}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
            <div style={{ color: '#fa8c16', fontWeight: 'bold', marginBottom: 8 }}>
              <AlertOutlined /> 判定规则
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="threshold_count"
                  label="连续异常件数"
                  initialValue={5}
                  rules={[{ required: true, message: '请输入阈值' }]}
                >
                  <InputNumber min={2} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="time_window_minutes"
                  label="时间窗口(分钟)"
                  initialValue={10}
                  rules={[{ required: true, message: '请输入时间窗口' }]}
                >
                  <InputNumber min={1} max={1440} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ color: '#666', fontSize: 12 }}>
              规则：在指定时间窗口内，同一种缺陷连续出现超过阈值件数时触发预警
            </div>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="severity_level"
                label="严重等级"
                initialValue={2}
              >
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="alert_level"
                label="告警等级"
                initialValue="critical"
              >
                <Select>
                  <Option value="critical">严重</Option>
                  <Option value="warning">警告</Option>
                  <Option value="info">提示</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
            <div style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: 12 }}>
              <BellOutlined /> 告警方式
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="sound_alert"
                  label="声音报警"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="light_alert"
                  label="灯光报警"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="notify_channels"
                  label="通知渠道"
                >
                  <Select mode="multiple" placeholder="选择通知渠道">
                    <Option value="email">邮件</Option>
                    <Option value="sms">短信</Option>
                    <Option value="app">APP推送</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item name="is_enabled" label="启用状态" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConfigModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="告警详情"
        placement="right"
        width={500}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {currentRecord && (
          <div>
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: isResolved(currentRecord) ? '#f6ffed' : '#fff2f0',
                borderColor: isResolved(currentRecord) ? '#b7eb8f' : '#ffa39e',
              }}
            >
              <Row align="middle">
                <Col span={16}>
                  <Space>
                    {isResolved(currentRecord) ? (
                      <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    ) : (
                      <AlertOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                    )}
                    <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                      {isResolved(currentRecord) ? '已处理' : '待处理'}
                    </span>
                  </Space>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  {!isResolved(currentRecord) && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => {
                        handleResolve(currentRecord.id)
                        setDetailDrawerVisible(false)
                      }}
                    >
                      立即处理
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="告警ID">{currentRecord.id}</Descriptions.Item>
              <Descriptions.Item label="告警编码">{currentRecord.alert_code}</Descriptions.Item>
              <Descriptions.Item label="缺陷类型">
                <Tag color="red">{currentRecord.defect_type_name || '-'}</Tag>
                <Tag color="orange">{currentRecord.alert_level}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="缺陷数量">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 18 }}>
                  {currentRecord.defect_count} 件
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="阈值">{currentRecord.threshold_count} 件</Descriptions.Item>
              <Descriptions.Item label="时间窗口">
                {currentRecord.time_window_minutes} 分钟
              </Descriptions.Item>
              <Descriptions.Item label="产线">{currentRecord.line_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="首次发现">
                <ClockCircleOutlined /> {dayjs(currentRecord.first_seen_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后发现">
                {dayjs(currentRecord.last_seen_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(currentRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {currentRecord.affected_serials && currentRecord.affected_serials.length > 0 && (
              <Card
                size="small"
                title={`受影响产品序列号 (${currentRecord.affected_serials.length}个)`}
                style={{ marginTop: 16 }}
              >
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {currentRecord.affected_serials.map((s, i) => (
                    <Tag key={i} style={{ marginBottom: 4 }}>{s}</Tag>
                  ))}
                </div>
              </Card>
            )}

            {isResolved(currentRecord) && (
              <Card
                size="small"
                title="处理信息"
                style={{ marginTop: 16 }}
              >
                <List size="small">
                  <List.Item>
                    <List.Item.Meta
                      title="处理人"
                      description={currentRecord.resolved_by || '-'}
                    />
                  </List.Item>
                  <List.Item>
                    <List.Item.Meta
                      title="处理说明"
                      description={currentRecord.resolution_notes || '-'}
                    />
                  </List.Item>
                  <List.Item>
                    <List.Item.Meta
                      title="处理时间"
                      description={currentRecord.resolved_at ? dayjs(currentRecord.resolved_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    />
                  </List.Item>
                </List>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  )
}

export default BatchAlert
