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
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import { inspectionApi, productApi, defectTypeApi, statisticsApi } from '../services/api'
import type { InspectionRecord, Product, Defect, DefectType, StatisticsSummary } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const History: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [records, setRecords] = useState<InspectionRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([])
  const [statistics, setStatistics] = useState<StatisticsSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchSn, setSearchSn] = useState('')
  const [filterResult, setFilterResult] = useState<string | undefined>()
  const [filterProduct, setFilterProduct] = useState<string | undefined>()
  const [filterDefectType, setFilterDefectType] = useState<string | undefined>()
  const [filterSeverity, setFilterSeverity] = useState<number | undefined>()
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
      }
      if (filterResult) params.result = filterResult
      if (filterProduct) params.product_code = filterProduct
      if (filterDefectType) params.defect_type_code = filterDefectType
      if (filterSeverity !== undefined) params.severity_level = filterSeverity
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

  const loadStatistics = async () => {
    setStatsLoading(true)
    try {
      const params: any = {
        period: 'day',
      }
      if (filterProduct) params.product_code = filterProduct
      if (filterDefectType) params.defect_type_code = filterDefectType
      if (filterSeverity !== undefined) params.severity_level = filterSeverity
      if (dateRange && dateRange.length === 2) {
        params.start_time = dateRange[0].toISOString()
        params.end_time = dateRange[1].toISOString()
      }

      const data = await statisticsApi.getSummary(params)
      setStatistics(data)
    } catch (e) {
      console.error(e)
    } finally {
      setStatsLoading(false)
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

  const loadDefectTypes = async () => {
    try {
      const data = await defectTypeApi.getList({ is_active: true })
      setDefectTypes(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadProducts()
    loadDefectTypes()
  }, [])

  useEffect(() => {
    loadData()
    loadStatistics()
  }, [page, pageSize, filterResult, filterProduct, filterDefectType, filterSeverity, dateRange])

  const handleSearch = () => {
    setPage(1)
    loadData()
    loadStatistics()
  }

  const handleReset = () => {
    setSearchSn('')
    setFilterResult(undefined)
    setFilterProduct(undefined)
    setFilterDefectType(undefined)
    setFilterSeverity(undefined)
    setDateRange(null)
    setPage(1)
    setTimeout(() => {
      loadData()
      loadStatistics()
    }, 0)
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

  const getDefectPieOption = () => {
    if (!statistics || statistics.defect_distribution.length === 0) {
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', left: 'left' },
        series: [
          {
            name: '缺陷分布',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['60%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: {
              label: { show: true, fontSize: 16, fontWeight: 'bold' },
            },
            labelLine: { show: false },
            data: [{ value: 0, name: '暂无数据' }],
          },
        ],
      }
    }
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', type: 'scroll' },
      series: [
        {
          name: '缺陷分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['65%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: statistics.defect_distribution.map((d) => ({ value: d.count, name: d.name })),
        },
      ],
    }
  }

  const defectRate = statistics ? (100 - statistics.pass_rate).toFixed(2) : '0.00'

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
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" loading={statsLoading}>
            <Statistic
              title="今日检测总数"
              value={statistics?.total_count || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={statsLoading}>
            <Statistic
              title="不良率"
              value={defectRate}
              suffix="%"
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={statsLoading}>
            <Statistic
              title="合格数"
              value={statistics?.pass_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" loading={statsLoading}>
            <Statistic
              title="不良数"
              value={(statistics?.rework_count || 0) + (statistics?.fail_count || 0)}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="缺陷类型分布" size="small" style={{ marginBottom: 16 }} loading={statsLoading}>
        <ReactECharts option={getDefectPieOption()} style={{ height: 240 }} />
      </Card>

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
          <Select
            placeholder="缺陷类型"
            value={filterDefectType}
            onChange={setFilterDefectType}
            style={{ width: 140 }}
            allowClear
          >
            {defectTypes.map((d) => (
              <Option key={d.code} value={d.code}>
                {d.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="缺陷等级"
            value={filterSeverity}
            onChange={setFilterSeverity}
            style={{ width: 120 }}
            allowClear
          >
            <Option value={1}>轻微</Option>
            <Option value={2}>一般</Option>
            <Option value={3}>严重</Option>
          </Select>
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
