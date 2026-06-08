import React, { useEffect, useState, useRef } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Upload,
  Table,
  Tag,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Progress,
  Statistic,
  List,
  Drawer,
  Descriptions,
  Tooltip,
} from 'antd'
import {
  UploadOutlined,
  PlayCircleOutlined,
  RollbackOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import {
  modelApi,
  trainingSampleApi,
  trainingTaskApi,
  defectTypeApi,
  productApi,
} from '../services/api'
import type {
  ModelVersion,
  TrainingSample,
  TrainingTask,
} from '../types'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { Option } = Select
const { TextArea } = Input

const ModelTuning: React.FC = () => {
  const [activeTab, setActiveTab] = useState('versions')
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<ModelVersion | null>(null)
  const [trainingSamples, setTrainingSamples] = useState<TrainingSample[]>([])
  const [trainingTasks, setTrainingTasks] = useState<TrainingTask[]>([])
  const [defectTypes, setDefectTypes] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [sampleType, setSampleType] = useState<'defect' | 'normal'>('defect')
  const [selectedDefectType, setSelectedDefectType] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')

  const [trainModalVisible, setTrainModalVisible] = useState(false)
  const [trainForm] = Form.useForm()

  const [annotateDrawerVisible, setAnnotateDrawerVisible] = useState(false)
  const [currentSample, setCurrentSample] = useState<TrainingSample | null>(null)
  const [annotateForm] = Form.useForm()

  const [currentTask, setCurrentTask] = useState<TrainingTask | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const loadModelVersions = async () => {
    try {
      const [versions, active] = await Promise.all([
        modelApi.getVersions(),
        modelApi.getActive(),
      ])
      setModelVersions(versions)
      setActiveVersion(active)
    } catch (e) {
      console.error(e)
    }
  }

  const loadTrainingSamples = async () => {
    setLoading(true)
    try {
      const data = await trainingSampleApi.getList({ limit: 100 })
      setTrainingSamples(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadTrainingTasks = async () => {
    try {
      const data = await trainingTaskApi.getList({ limit: 50 })
      setTrainingTasks(data)
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

  const loadProducts = async () => {
    try {
      const data = await productApi.getList({ is_active: true })
      setProducts(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadModelVersions()
    loadTrainingSamples()
    loadTrainingTasks()
    loadDefectTypes()
    loadProducts()
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/realtime`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'training_progress') {
          setTrainingTasks((prev) =>
            prev.map((t) =>
              t.id === data.data.task_id
                ? { ...t, progress: data.data.progress, loss: data.data.loss, accuracy: data.data.accuracy }
                : t
            )
          )
          if (currentTask?.id === data.data.task_id) {
            setCurrentTask((prev) =>
              prev
                ? { ...prev, progress: data.data.progress, loss: data.data.loss, accuracy: data.data.accuracy }
                : null
            )
          }
        } else if (data.type === 'training_completed') {
          message.success('训练完成！')
          loadModelVersions()
          loadTrainingTasks()
          loadTrainingSamples()
        }
      } catch (e) {
        console.error('WebSocket parse error:', e)
      }
    }

    return () => {
      wsRef.current?.close()
    }
  }, [currentTask?.id])

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file } = options as any
    try {
      const params: any = {
        sample_type: sampleType,
        product_code: selectedProduct || undefined,
      }
      if (sampleType === 'defect' && selectedDefectType) {
        const dt = defectTypes.find((d) => d.code === selectedDefectType)
        params.defect_type_code = selectedDefectType
        params.defect_type_name = dt?.name
      }
      await trainingSampleApi.upload(file, params)
      message.success('上传成功')
      loadTrainingSamples()
    } catch (e: any) {
      message.error('上传失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await modelApi.activate(id)
      message.success('激活成功')
      loadModelVersions()
    } catch (e: any) {
      message.error('激活失败: ' + e.message)
    }
  }

  const handleRollback = async (id: number) => {
    Modal.confirm({
      title: '确认回滚',
      content: '确定要回滚到此版本吗？当前线上版本将被替换。',
      onOk: async () => {
        try {
          await modelApi.rollback(id)
          message.success('回滚成功')
          loadModelVersions()
        } catch (e: any) {
          message.error('回滚失败: ' + e.message)
        }
      },
    })
  }

  const handleDeleteSample = async (id: number) => {
    try {
      await trainingSampleApi.delete(id)
      message.success('删除成功')
      loadTrainingSamples()
    } catch (e: any) {
      message.error('删除失败: ' + e.message)
    }
  }

  const handleAnnotate = (sample: TrainingSample) => {
    setCurrentSample(sample)
    annotateForm.setFieldsValue({
      defect_type_code: sample.defect_type_code,
      defect_type_name: sample.defect_type_name,
    })
    setAnnotateDrawerVisible(true)
  }

  const handleSaveAnnotation = async (values: any) => {
    if (!currentSample) return
    try {
      await trainingSampleApi.annotate(currentSample.id, {
        ...values,
        annotations: values.annotations ? JSON.parse(values.annotations) : undefined,
      })
      message.success('标注保存成功')
      setAnnotateDrawerVisible(false)
      loadTrainingSamples()
    } catch (e: any) {
      message.error('保存失败: ' + e.message)
    }
  }

  const handleStartTraining = async (values: any) => {
    try {
      const task = await trainingTaskApi.create({
        ...values,
        sample_ids: [],
      })
      message.success('训练任务已创建')
      setTrainModalVisible(false)
      trainForm.resetFields()
      loadTrainingTasks()
      setCurrentTask(task)
      setActiveTab('tasks')
    } catch (e: any) {
      message.error('创建失败: ' + e.message)
    }
  }

  const annotatedCount = trainingSamples.filter((s) => s.is_annotated).length
  const unusedCount = trainingSamples.filter((s) => s.is_annotated && !s.is_used).length
  const defectSampleCount = trainingSamples.filter((s) => s.sample_type === 'defect').length
  const normalSampleCount = trainingSamples.filter((s) => s.sample_type === 'normal').length

  const versionColumns = [
    {
      title: '版本号',
      dataIndex: 'version_code',
      key: 'version_code',
      width: 120,
      render: (code: string, record: ModelVersion) => (
        <Space>
          <span style={{ fontWeight: 'bold' }}>{code}</span>
          {record.is_active && <Tag color="green">当前版本</Tag>}
        </Space>
      ),
    },
    { title: '版本名称', dataIndex: 'version_name', key: 'version_name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (v: number) => `${(v * 100).toFixed(2)}%`,
    },
    {
      title: '精确率',
      dataIndex: 'precision',
      key: 'precision',
      render: (v: number) => `${(v * 100).toFixed(2)}%`,
    },
    {
      title: '召回率',
      dataIndex: 'recall',
      key: 'recall',
      render: (v: number) => `${(v * 100).toFixed(2)}%`,
    },
    {
      title: 'F1分数',
      dataIndex: 'f1_score',
      key: 'f1_score',
      render: (v: number) => `${(v * 100).toFixed(2)}%`,
    },
    { title: '训练样本数', dataIndex: 'training_samples', key: 'training_samples' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: ModelVersion) => (
        <Space>
          {!record.is_active ? (
            <Button size="small" type="primary" onClick={() => handleActivate(record.id)}>
              激活
            </Button>
          ) : (
            <Tag color="green">运行中</Tag>
          )}
          {!record.is_active && (
            <Button size="small" icon={<RollbackOutlined />} onClick={() => handleRollback(record.id)}>
              回滚
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const sampleColumns = [
    {
      title: '样本ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '图片',
      dataIndex: 'image_path',
      key: 'image_path',
      width: 100,
      render: (path: string) => (
        <img
          src={path}
          alt="样本"
          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'sample_type',
      key: 'sample_type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'defect' ? 'red' : 'green'}>
          {type === 'defect' ? '缺陷' : '正常'}
        </Tag>
      ),
    },
    {
      title: '缺陷类型',
      dataIndex: 'defect_type_name',
      key: 'defect_type_name',
      render: (name: string) => name || '-',
    },
    { title: '产品型号', dataIndex: 'product_code', key: 'product_code', render: (c: string) => c || '-' },
    {
      title: '标注状态',
      dataIndex: 'is_annotated',
      key: 'is_annotated',
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'orange'}>{v ? '已标注' : '未标注'}</Tag>
      ),
    },
    {
      title: '使用状态',
      dataIndex: 'is_used',
      key: 'is_used',
      render: (v: boolean) => (
        <Tag color={v ? 'blue' : 'default'}>{v ? '已使用' : '未使用'}</Tag>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: TrainingSample) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleAnnotate(record)}>
            {record.is_annotated ? '查看' : '标注'}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSample(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const taskColumns = [
    { title: '任务名称', dataIndex: 'task_name', key: 'task_name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '等待中' },
          training: { color: 'processing', text: '训练中' },
          completed: { color: 'green', text: '已完成' },
          failed: { color: 'red', text: '失败' },
        }
        const info = statusMap[status] || statusMap.pending
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record: TrainingTask) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
        />
      ),
    },
    { title: '样本数', dataIndex: 'sample_count', key: 'sample_count', width: 80 },
    { title: '训练轮次', dataIndex: 'epochs', key: 'epochs', width: 80 },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 100,
      render: (v: number) => (v > 0 ? `${(v * 100).toFixed(2)}%` : '-'),
    },
    {
      title: '生成版本',
      dataIndex: 'model_version_code',
      key: 'model_version_code',
      render: (code: string) => code || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ]

  return (
    <Card
      title="模型调优"
      extra={
        <Space>
          <Tag icon={<SafetyCertificateOutlined />} color="green">
            当前版本: {activeVersion?.version_code || '-'}
          </Tag>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <DatabaseOutlined /> 训练样本
            </span>
          }
          key="samples"
        >
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="样本总数"
                  value={trainingSamples.length}
                  prefix={<ExperimentOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="缺陷样本"
                  value={defectSampleCount}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="正常样本"
                  value={normalSampleCount}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="待训练样本"
                  value={unusedCount}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title="上传样本"
            style={{ marginBottom: 16 }}
            extra={
              <Space>
                <Select
                  value={sampleType}
                  onChange={(v) => setSampleType(v)}
                  style={{ width: 120 }}
                >
                  <Option value="defect">缺陷样本</Option>
                  <Option value="normal">正常样本</Option>
                </Select>
                {sampleType === 'defect' && (
                  <Select
                    value={selectedDefectType}
                    onChange={setSelectedDefectType}
                    style={{ width: 140 }}
                    placeholder="选择缺陷类型"
                    allowClear
                  >
                    {defectTypes.map((d) => (
                      <Option key={d.code} value={d.code}>
                        {d.name}
                      </Option>
                    ))}
                  </Select>
                )}
                <Select
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  style={{ width: 160 }}
                  placeholder="选择产品型号"
                  allowClear
                >
                  {products.map((p) => (
                    <Option key={p.product_code} value={p.product_code}>
                      {p.product_name}
                    </Option>
                  ))}
                </Select>
                <Upload
                  customRequest={handleUpload}
                  showUploadList={false}
                  accept="image/*"
                  multiple
                >
                  <Button type="primary" icon={<UploadOutlined />}>
                    上传图片
                  </Button>
                </Upload>
              </Space>
            }
          >
            <div style={{ color: '#999', fontSize: 12 }}>
              支持批量上传图片，上传后请及时标注缺陷样本。正常样本无需标注。
            </div>
          </Card>

          <Table
            dataSource={trainingSamples}
            columns={sampleColumns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <PlayCircleOutlined /> 训练任务
            </span>
          }
          key="tasks"
        >
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={unusedCount === 0}
                onClick={() => setTrainModalVisible(true)}
              >
                开始训练
              </Button>
              <Tooltip title={unusedCount > 0 ? '可以开始训练' : '请先上传并标注样本'}>
                <span style={{ color: '#999' }}>
                  可用样本: {unusedCount} 个
                </span>
              </Tooltip>
            </Space>
          </div>

          <Table
            dataSource={trainingTasks}
            columns={taskColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            onRow={(record) => ({
              onClick: () => setCurrentTask(record),
            })}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <HistoryOutlined /> 模型版本
            </span>
          }
          key="versions"
        >
          <Table
            dataSource={modelVersions}
            columns={versionColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />

          {currentTask && currentTask.status === 'training' && (
            <Card
              title={`训练进行中: ${currentTask.task_name}`}
              style={{ marginTop: 16 }}
              size="small"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Progress
                    percent={currentTask.progress}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>准确率</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                    {(currentTask.accuracy * 100).toFixed(2)}%
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ color: '#666' }}>损失值</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {currentTask.loss.toFixed(4)}
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </TabPane>
      </Tabs>

      <Modal
        title="开始训练"
        open={trainModalVisible}
        onCancel={() => setTrainModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={trainForm} layout="vertical" onFinish={handleStartTraining}>
          <Form.Item
            name="task_name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="任务描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="epochs" label="训练轮次" initialValue={10}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="learning_rate" label="学习率" initialValue={0.001}>
                <InputNumber
                  min={0.0001}
                  max={0.1}
                  step={0.0001}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="batch_size" label="批次大小" initialValue={16}>
                <InputNumber min={1} max={128} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ color: '#666', marginBottom: 8 }}>训练信息</div>
            <List size="small">
              <List.Item>
                <List.Item.Meta title="可用样本数" description={`${unusedCount} 个已标注样本`} />
              </List.Item>
              <List.Item>
                <List.Item.Meta title="预计耗时" description="约 5-10 分钟" />
              </List.Item>
            </List>
          </div>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setTrainModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                开始训练
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="样本标注"
        placement="right"
        width={500}
        open={annotateDrawerVisible}
        onClose={() => setAnnotateDrawerVisible(false)}
      >
        {currentSample && (
          <div>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img
                src={currentSample.image_path}
                alt="样本"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
              />
            </div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="样本类型">
                <Tag color={currentSample.sample_type === 'defect' ? 'red' : 'green'}>
                  {currentSample.sample_type === 'defect' ? '缺陷样本' : '正常样本'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="产品型号">
                {currentSample.product_code || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {dayjs(currentSample.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {currentSample.sample_type === 'defect' && (
              <Form form={annotateForm} layout="vertical" onFinish={handleSaveAnnotation}>
                <Form.Item
                  name="defect_type_code"
                  label="缺陷类型"
                  rules={[{ required: true, message: '请选择缺陷类型' }]}
                >
                  <Select placeholder="请选择缺陷类型">
                    {defectTypes.map((d) => (
                      <Option key={d.code} value={d.code}>
                        {d.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="annotations" label="标注信息(JSON)">
                  <TextArea rows={4} placeholder='[{"x1": 10, "y1": 20, "x2": 100, "y2": 80}]' />
                </Form.Item>
                <div style={{ textAlign: 'right' }}>
                  <Button type="primary" htmlType="submit">
                    保存标注
                  </Button>
                </div>
              </Form>
            )}

            {currentSample.sample_type === 'normal' && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#52c41a' }}>
                <CheckCircleOutlined style={{ fontSize: 48 }} />
                <div style={{ marginTop: 8 }}>正常样本无需标注</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  )
}

export default ModelTuning
