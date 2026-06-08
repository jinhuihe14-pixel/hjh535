import React, { useState, useEffect, useRef } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Select,
  Input,
  Tag,
  Table,
  Space,
  Upload,
  message,
  Badge,
  Statistic,
  List,
  Avatar,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UploadOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { inspectionApi, productApi, productionLineApi } from '../services/api'
import type { DetectionResult, Product, ProductionLine, InspectionRecord } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const RealTimeDetection: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedLine, setSelectedLine] = useState<string>('')
  const [recentResults, setRecentResults] = useState<InspectionRecord[]>([])
  const [stats, setStats] = useState({ total: 0, pass: 0, rework: 0, fail: 0 })
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const loadInitData = async () => {
      try {
        const [productList, lineList, records] = await Promise.all([
          productApi.getList({ is_active: true }),
          productionLineApi.getList(),
          inspectionApi.getList({ limit: 20 }),
        ])
        setProducts(productList)
        setLines(lineList)
        setRecentResults(records)
        if (productList.length > 0) {
          setSelectedProduct(productList[0].product_code)
        }
        if (lineList.length > 0) {
          setSelectedLine(lineList[0].line_code)
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadInitData()
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/realtime`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'detection_result') {
          const result = data.data as DetectionResult
          setCurrentResult(result)
          setStats((prev) => ({
            total: prev.total + 1,
            pass: prev.pass + (result.result === 'pass' ? 1 : 0),
            rework: prev.rework + (result.result === 'rework' ? 1 : 0),
            fail: prev.fail + (result.result === 'fail' ? 1 : 0),
          }))

          const record: InspectionRecord = {
            id: Date.now(),
            serial_number: result.serial_number,
            product_code: result.product_code,
            result: result.result,
            severity_level: result.severity_level,
            defect_count: result.defect_count,
            inspection_time: result.timestamp,
            processing_time: result.processing_time,
            image_path: result.image_path,
            is_synced: true,
            defects: result.defects.map((d, i) => ({
              id: i,
              inspection_record_id: Date.now(),
              defect_type_id: 0,
              created_at: result.timestamp,
              ...d,
            })),
          }
          setRecentResults((prev) => [record, ...prev].slice(0, 20))
        }
      } catch (e) {
        console.error('WebSocket parse error:', e)
      }
    }

    return () => {
      wsRef.current?.close()
    }
  }, [])

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file } = options as any
    try {
      const result = await inspectionApi.detect(file, {
        product_code: selectedProduct,
        line_number: selectedLine,
      })
      setCurrentResult(result)
      message.success('检测完成')
    } catch (e: any) {
      message.error('检测失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const simulateDetection = async () => {
    const images = [
      'SN202606072105164146.jpg',
      'SN202606072105169246.jpg',
      'SN202606072105182035.jpg',
    ]
    const randomImage = images[Math.floor(Math.random() * images.length)]

    try {
      const response = await fetch(`/backend/backend/app/static/images/${randomImage}`)
      if (!response.ok) throw new Error('Failed to fetch image')
      const blob = await response.blob()
      const file = new File([blob], 'test.jpg', { type: 'image/jpeg' })

      const result = await inspectionApi.detect(file, {
        product_code: selectedProduct,
        line_number: selectedLine,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const toggleSimulation = () => {
    if (isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsRunning(false)
    } else {
      setIsRunning(true)
      simulateDetection()
      timerRef.current = window.setInterval(simulateDetection, 3000)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const getResultTag = (result: string) => {
    const map: Record<string, { color: string; text: string; icon: any }> = {
      pass: { color: 'green', text: '合格', icon: <CheckCircleOutlined /> },
      rework: { color: 'orange', text: '返工', icon: <ToolOutlined /> },
      fail: { color: 'red', text: '报废', icon: <CloseCircleOutlined /> },
    }
    const info = map[result] || map.pass
    return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>
  }

  const columns = [
    {
      title: '序列号',
      dataIndex: 'serial_number',
      key: 'serial_number',
      width: 180,
    },
    {
      title: '产品',
      dataIndex: 'product_code',
      key: 'product_code',
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => getResultTag(result),
    },
    {
      title: '缺陷数',
      dataIndex: 'defect_count',
      key: 'defect_count',
    },
    {
      title: '检测时间',
      dataIndex: 'inspection_time',
      key: 'inspection_time',
      render: (t: string) => dayjs(t).format('HH:mm:ss'),
    },
  ]

  const getSeverityColor = (level: number) => {
    const colors: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' }
    return colors[level] || 'default'
  }

  const getSeverityText = (level: number) => {
    const texts: Record<number, string> = { 1: '轻微', 2: '一般', 3: '严重' }
    return texts[level] || '未知'
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="今日检测"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="合格"
              value={stats.pass}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="返工"
              value={stats.rework}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="报废"
              value={stats.fail}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title="实时检测画面"
            extra={
              <Space>
                <Select
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  style={{ width: 160 }}
                  placeholder="选择产品"
                >
                  {products.map((p) => (
                    <Option key={p.product_code} value={p.product_code}>
                      {p.product_name}
                    </Option>
                  ))}
                </Select>
                <Select
                  value={selectedLine}
                  onChange={setSelectedLine}
                  style={{ width: 120 }}
                  placeholder="选择产线"
                >
                  {lines.map((l) => (
                    <Option key={l.line_code} value={l.line_code}>
                      {l.line_name}
                    </Option>
                  ))}
                </Select>
                <Upload
                  customRequest={handleUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />}>上传检测</Button>
                </Upload>
                <Button
                  type={isRunning ? 'default' : 'primary'}
                  icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  danger={isRunning}
                  onClick={toggleSimulation}
                >
                  {isRunning ? '停止模拟' : '开始模拟'}
                </Button>
              </Space>
            }
          >
            <div style={{ textAlign: 'center', minHeight: 350, background: '#fafafa', borderRadius: 8, padding: 20 }}>
              {currentResult?.image_path ? (
                <img
                  src={currentResult.image_path}
                  alt="检测图像"
                  className="detection-image"
                />
              ) : (
                <div style={{ padding: '100px 0', color: '#999' }}>
                  <CameraOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                  <div>等待检测...</div>
                </div>
              )}
            </div>

            {currentResult && (
              <div style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666' }}>序列号: </span>
                      <span>{currentResult.serial_number}</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666' }}>检测结果: </span>
                      {getResultTag(currentResult.result)}
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>处理时间: </span>
                      <span>{(currentResult.processing_time * 1000).toFixed(0)} ms</span>
                    </div>
                  </Col>
                  <Col span={16}>
                    <div style={{ marginBottom: 8, color: '#666' }}>缺陷列表:</div>
                    <div>
                      {currentResult.defects.length === 0 ? (
                        <Tag color="green">无缺陷</Tag>
                      ) : (
                        currentResult.defects.map((d, i) => (
                          <Tag
                            key={i}
                            color={getSeverityColor(d.severity_level)}
                            style={{ marginBottom: 4 }}
                          >
                            {d.defect_type_name}
                            <span style={{ marginLeft: 4 }}>
                              ({(d.confidence * 100).toFixed(0)}%)
                            </span>
                          </Tag>
                        ))
                      )}
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="最近检测记录" size="small">
            <Table
              dataSource={recentResults}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 500 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RealTimeDetection
