import React, { useEffect, useState } from 'react'
import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Modal,
  Image,
  Descriptions,
  Row,
  Col,
  List,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inspectionApi, productApi } from '../services/api'
import type { InspectionRecord, Product, Defect } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const History: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<InspectionRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchSn, setSearchSn] = useState('')
  const [filterResult, setFilterResult] = useState<string | undefined>()
  const [filterProduct, setFilterProduct] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<any>(null)
  const [detailModal, setDetailModal] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<InspectionRecord | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }
      if (searchSn) {
        // Not supporting SN search directly from list, will handle separately
      }
      if (filterResult) params.result = filterResult
      if (filterProduct) params.product_code = filterProduct
      if (dateRange && dateRange.length === 2) {
        params.start_time = dateRange[0].toISOString()
        params.end_time = dateRange[1].toISOString()
      }

      const data = await inspectionApi.getList(params)
      setRecords(data)
      setTotal(data.length < pageSize ? (page - 1) * pageSize + data.length : page * pageSize + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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
    loadProducts()
  }, [])

  useEffect(() => {
    loadData()
  }, [page, pageSize, filterResult, filterProduct, dateRange])

  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  const handleReset = () => {
    setSearchSn('')
    setFilterResult(undefined)
    setFilterProduct(undefined)
    setDateRange(null)
    setPage(1)
    setTimeout(loadData, 0)
  }

  const handleViewDetail = async (record: InspectionRecord) => {
    try {
      const detail = await inspectionApi.get(record.id)
      setCurrentRecord(detail)
      setDetailModal(true)
    } catch (e) {
      console.error(e)
    }
  }

  const getResultTag = (result: string) => {
    const map: Record<string, { color: string; text: string; icon: any }> = {
      pass: { color: 'green', text: '合格', icon: <CheckCircleOutlined /> },
      rework: { color: 'orange', text: '返工', icon: <ToolOutlined /> },
      fail: { color: 'red', text: '报废', icon: <CloseCircleOutlined /> },
    }
    const info = map[result] || map.pass
    return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>
  }

  const getSeverityColor = (level: number) => {
    const colors: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' }
    return colors[level] || 'default'
  }

  const getSeverityText = (level: number) => {
    const texts: Record<number, string> = { 1: '轻微', 2: '一般', 3: '严重' }
    return texts[level] || '未知'
  }

  const columns: ColumnsType<InspectionRecord> = [
    {
      title: '序列号',
      dataIndex: 'serial_number',
      key: 'serial_number',
      width: 180,
    },
    {
      title: '产品型号',
      dataIndex: 'product_code',
      key: 'product_code',
      width: 120,
    },
    {
      title: '产线',
      dataIndex: 'line_number',
      key: 'line_number',
      width: 100,
    },
    {
      title: '班次',
      dataIndex: 'shift',
      key: 'shift',
      width: 80,
    },
    {
      title: '检测结果',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (result: string) => getResultTag(result),
    },
    {
      title: '缺陷数量',
      dataIndex: 'defect_count',
      key: 'defect_count',
      width: 90,
      sorter: (a, b) => a.defect_count - b.defect_count,
    },
    {
      title: '严重等级',
      dataIndex: 'severity_level',
      key: 'severity_level',
      width: 100,
      render: (level: number) => (
        <Tag color={getSeverityColor(level)}>{getSeverityText(level)}</Tag>
      ),
    },
    {
      title: '处理时间',
      dataIndex: 'processing_time',
      key: 'processing_time',
      width: 100,
      render: (t: number) => `${(t * 1000).toFixed(0)} ms`,
    },
    {
      title: '检测时间',
      dataIndex: 'inspection_time',
      key: 'inspection_time',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.inspection_time).getTime() - new Date(b.inspection_time).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="输入序列号"
            prefix={<SearchOutlined />}
            value={searchSn}
            onChange={(e) => setSearchSn(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="检测结果"
            value={filterResult}
            onChange={setFilterResult}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="pass">合格</Option>
            <Option value="rework">返工</Option>
            <Option value="fail">报废</Option>
          </Select>
          <Select
            placeholder="产品型号"
            value={filterProduct}
            onChange={setFilterProduct}
            style={{ width: 160 }}
            allowClear
          >
            {products.map((p) => (
              <Option key={p.product_code} value={p.product_code}>
                {p.product_name}
              </Option>
            ))}
          </Select>
          <RangePicker value={dateRange} onChange={setDateRange} />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          loading={loading}
          dataSource={records}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>

      <Modal
        title="检测详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={900}
      >
        {currentRecord && (
          <div>
            <Row gutter={24}>
              <Col span={14}>
                <div style={{ marginBottom: 12, fontWeight: 'bold' }}>检测图像</div>
                {currentRecord.image_path ? (
                  <Image
                    width="100%"
                    src={currentRecord.image_path}
                    alt="检测图像"
                  />
                ) : (
                  <div style={{ background: '#f5f5f5', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    无图像
                  </div>
                )}
              </Col>
              <Col span={10}>
                <Descriptions title="基本信息" column={1} size="small" bordered>
                  <Descriptions.Item label="序列号">
                    {currentRecord.serial_number}
                  </Descriptions.Item>
                  <Descriptions.Item label="产品型号">
                    {currentRecord.product_code}
                  </Descriptions.Item>
                  <Descriptions.Item label="产线">
                    {currentRecord.line_number || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="工位">
                    {currentRecord.workstation || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="班次">
                    {currentRecord.shift || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="检测结果">
                    {getResultTag(currentRecord.result)}
                  </Descriptions.Item>
                  <Descriptions.Item label="缺陷数量">
                    {currentRecord.defect_count}
                  </Descriptions.Item>
                  <Descriptions.Item label="严重等级">
                    <Tag color={getSeverityColor(currentRecord.severity_level)}>
                      {getSeverityText(currentRecord.severity_level)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="处理时间">
                    {(currentRecord.processing_time * 1000).toFixed(0)} ms
                  </Descriptions.Item>
                  <Descriptions.Item label="检测时间">
                    {dayjs(currentRecord.inspection_time).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
                缺陷列表 ({currentRecord.defects.length})
              </div>
              {currentRecord.defects.length === 0 ? (
                <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>无缺陷</div>
              ) : (
                <List
                  size="small"
                  bordered
                  dataSource={currentRecord.defects}
                  renderItem={(defect: Defect) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={getSeverityColor(defect.severity_level)}>
                              {defect.defect_type_name}
                            </Tag>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              置信度: {(defect.confidence * 100).toFixed(1)}%
                            </span>
                          </Space>
                        }
                        description={
                          <div>
                            <div>位置: ({defect.center_x?.toFixed(0)}, {defect.center_y?.toFixed(0)})</div>
                            <div>尺寸: {defect.width?.toFixed(0)} x {defect.height?.toFixed(0)}</div>
                            {defect.description && <div>{defect.description}</div>}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default History
