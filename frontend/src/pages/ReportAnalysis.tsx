import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Select,
  DatePicker,
  Table,
  Button,
  Space,
  Tabs,
  Statistic,
  Tag,
  Spin,
  Modal,
  Form,
  Input,
  message,
  List,
} from 'antd'
import {
  DownloadOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { reportApi, reworkApi, productApi, defectTypeApi, reportScheduleApi } from '../services/api'
import type { MultiDimensionReport, TrendReport, ReworkStatistics, ReportSchedule } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { TabPane } = Tabs
const { TextArea } = Input

const ReportAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dimension, setDimension] = useState('line_number')
  const [trendPeriod, setTrendPeriod] = useState('week')
  const [trendMetric, setTrendMetric] = useState('fail_rate')
  const [productCode, setProductCode] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const [multiDimData, setMultiDimData] = useState<MultiDimensionReport | null>(null)
  const [trendData, setTrendData] = useState<TrendReport | null>(null)
  const [reworkStats, setReworkStats] = useState<ReworkStatistics | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [defectTypes, setDefectTypes] = useState<any[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false)
  const [scheduleForm] = Form.useForm()

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

  const loadMultiDimReport = async () => {
    setLoading(true)
    try {
      const params: any = { dimension }
      if (productCode) params.product_code = productCode
      if (dateRange) {
        params.start_time = dateRange[0].toISOString()
        params.end_time = dateRange[1].toISOString()
      }
      const data = await reportApi.getMultiDimension(params)
      setMultiDimData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadTrendReport = async () => {
    setLoading(true)
    try {
      const params: any = { period: trendPeriod, metric: trendMetric }
      if (productCode) params.product_code = productCode
      const data = await reportApi.getTrend(params)
      setTrendData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadReworkStats = async () => {
    try {
      const data = await reworkApi.getStatistics({ period: 'month' })
      setReworkStats(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadSchedules = async () => {
    try {
      const data = await reportScheduleApi.getList()
      setSchedules(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadProducts()
    loadDefectTypes()
    loadMultiDimReport()
    loadTrendReport()
    loadReworkStats()
    loadSchedules()
  }, [])

  useEffect(() => {
    loadMultiDimReport()
  }, [dimension, productCode, dateRange])

  useEffect(() => {
    loadTrendReport()
  }, [trendPeriod, trendMetric, productCode])

  const handleExport = async (format: string) => {
    try {
      const params: any = { format }
      if (productCode) params.product_code = productCode
      if (dateRange) {
        params.start_time = dateRange[0].toISOString()
        params.end_time = dateRange[1].toISOString()
      }
      const response = await reportApi.export(params)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `report_${dayjs().format('YYYYMMDDHHmmss')}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (e: any) {
      message.error('导出失败: ' + e.message)
    }
  }

  const getBarChartOption = () => {
    if (!multiDimData) return {}
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['合格数', '返工数', '报废数'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: multiDimData.data.map((d) => d.dimension_value),
        axisLabel: { rotate: 30, interval: 0 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '合格数',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#52c41a' },
          data: multiDimData.data.map((d) => d.pass_count),
        },
        {
          name: '返工数',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#faad14' },
          data: multiDimData.data.map((d) => d.rework_count),
        },
        {
          name: '报废数',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#ff4d4f' },
          data: multiDimData.data.map((d) => d.fail_count),
        },
      ],
    }
  }

  const getPieChartOption = () => {
    if (!multiDimData) return {}
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
            label: { show: true, fontSize: 18, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: multiDimData.data.map((d) => ({
            value: d.defect_count,
            name: d.dimension_value,
          })),
        },
      ],
    }
  }

  const getTrendChartOption = () => {
    if (!trendData) return {}
    const metricNames: Record<string, string> = {
      pass_rate: '合格率(%)',
      fail_rate: '不良率(%)',
      defect_count: '缺陷数',
      total_count: '检测总数',
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: [metricNames[trendMetric]] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.data.map((d) => d.time),
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: metricNames[trendMetric],
          type: 'line',
          smooth: true,
          data: trendData.data.map((d) => d.value),
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
              ],
            },
          },
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
        },
      ],
    }
  }

  const multiDimColumns = [
    {
      title: '维度值',
      dataIndex: 'dimension_value',
      key: 'dimension_value',
      width: 150,
    },
    {
      title: '检测总数',
      dataIndex: 'total_count',
      key: 'total_count',
      sorter: (a: any, b: any) => a.total_count - b.total_count,
    },
    {
      title: '合格数',
      dataIndex: 'pass_count',
      key: 'pass_count',
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
    },
    {
      title: '返工数',
      dataIndex: 'rework_count',
      key: 'rework_count',
      render: (v: number) => <span style={{ color: '#faad14' }}>{v}</span>,
    },
    {
      title: '报废数',
      dataIndex: 'fail_count',
      key: 'fail_count',
      render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
    },
    {
      title: '合格率',
      dataIndex: 'pass_rate',
      key: 'pass_rate',
      render: (v: number) => `${v.toFixed(2)}%`,
      sorter: (a: any, b: any) => a.pass_rate - b.pass_rate,
    },
    {
      title: '缺陷数',
      dataIndex: 'defect_count',
      key: 'defect_count',
    },
  ]

  const handleCreateSchedule = async (values: any) => {
    try {
      await reportScheduleApi.create({
        ...values,
        recipients: values.recipients?.split(',').map((s: string) => s.trim()),
      })
      message.success('创建成功')
      setScheduleModalVisible(false)
      scheduleForm.resetFields()
      loadSchedules()
    } catch (e: any) {
      message.error('创建失败: ' + e.message)
    }
  }

  return (
    <Spin spinning={loading}>
      <Card
        title="报表分析"
        extra={
          <Space>
            <Select
              value={productCode}
              onChange={setProductCode}
              style={{ width: 160 }}
              allowClear
              placeholder="选择产品"
            >
              {products.map((p) => (
                <Option key={p.product_code} value={p.product_code}>
                  {p.product_name}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              showTime
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('csv')}
            >
              导出CSV
            </Button>
            <Button
              type="primary"
              onClick={() => setScheduleModalVisible(true)}
            >
              定时推送
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="multi-dim">
          <TabPane
            tab={
              <span>
                <BarChartOutlined /> 多维度分析
              </span>
            }
            key="multi-dim"
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="总记录数"
                    value={multiDimData?.total_records || 0}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={18}>
                <Space wrap>
                  <span style={{ color: '#666' }}>分析维度:</span>
                  <Select value={dimension} onChange={setDimension} style={{ width: 140 }}>
                    <Option value="line_number">按产线</Option>
                    <Option value="shift">按班次</Option>
                    <Option value="workstation">按工位</Option>
                    <Option value="product_code">按产品型号</Option>
                    <Option value="defect_type">按缺陷类型</Option>
                    <Option value="severity_level">按缺陷等级</Option>
                  </Select>
                </Space>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={14}>
                <Card title="分布柱状图" size="small">
                  <ReactECharts option={getBarChartOption()} style={{ height: 320 }} />
                </Card>
              </Col>
              <Col span={10}>
                <Card title="缺陷占比" size="small">
                  <ReactECharts option={getPieChartOption()} style={{ height: 320 }} />
                </Card>
              </Col>
            </Row>

            <Card title="详细数据" size="small" style={{ marginTop: 16 }}>
              <Table
                dataSource={multiDimData?.data || []}
                columns={multiDimColumns}
                rowKey="dimension_key"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <PieChartOutlined /> 趋势分析
              </span>
            }
            key="trend"
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Space>
                  <span style={{ color: '#666' }}>时间周期:</span>
                  <Select value={trendPeriod} onChange={setTrendPeriod} style={{ width: 120 }}>
                    <Option value="day">今日(24小时)</Option>
                    <Option value="week">本周(7天)</Option>
                    <Option value="month">本月(30天)</Option>
                  </Select>
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <span style={{ color: '#666' }}>指标:</span>
                  <Select value={trendMetric} onChange={setTrendMetric} style={{ width: 140 }}>
                    <Option value="pass_rate">合格率</Option>
                    <Option value="fail_rate">不良率</Option>
                    <Option value="defect_count">缺陷数</Option>
                    <Option value="total_count">检测总数</Option>
                  </Select>
                </Space>
              </Col>
            </Row>

            <Card title="趋势曲线图">
              <ReactECharts option={getTrendChartOption()} style={{ height: 400 }} />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ToolOutlined /> 返工分析
              </span>
            }
            key="rework"
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="返工总数"
                    value={reworkStats?.total_rework_count || 0}
                    prefix={<ToolOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="返工合格数"
                    value={reworkStats?.rework_pass_count || 0}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="返工合格率"
                    value={reworkStats?.rework_pass_rate || 0}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="平均缺陷减少"
                    value={reworkStats?.avg_rework_defect_reduction || 0}
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title="各产品返工情况" size="small">
                  <List
                    dataSource={reworkStats?.by_product || []}
                    renderItem={(item: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.product_code}
                          description={`共${item.total}件，合格${item.pass}件，失败${item.fail}件`}
                        />
                        <Tag color="blue">
                          合格率: {item.total > 0 ? ((item.pass / item.total) * 100).toFixed(1) : 0}%
                        </Tag>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="返工工艺效果评估" size="small">
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 'bold', color: '#52c41a' }}>
                      {reworkStats?.avg_rework_defect_reduction?.toFixed(1) || 0}%
                    </div>
                    <div style={{ color: '#999', marginTop: 8 }}>
                      平均缺陷数量减少比例
                    </div>
                    <div style={{ marginTop: 16, color: '#666' }}>
                      <p>• 返工工艺整体有效，缺陷显著减少</p>
                      <p>• 建议加强返工后二次检测质量管控</p>
                      <p>• 针对高返工缺陷类型优化生产工艺</p>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane
            tab={
              <span>
                <ClockCircleOutlined /> 定时推送
              </span>
            }
            key="schedule"
          >
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" onClick={() => setScheduleModalVisible(true)}>
                新增定时任务
              </Button>
            </div>
            <Table
              dataSource={schedules}
              rowKey="id"
              size="small"
              columns={[
                { title: '任务名称', dataIndex: 'schedule_name', key: 'schedule_name' },
                { title: '报表类型', dataIndex: 'report_type', key: 'report_type' },
                {
                  title: '推送频率',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  render: (v: string) => {
                    const map: Record<string, string> = {
                      daily: '每日',
                      weekly: '每周',
                      monthly: '每月',
                      hourly: '每小时',
                    }
                    return map[v] || v
                  },
                },
                { title: '文件格式', dataIndex: 'file_format', key: 'file_format' },
                {
                  title: '状态',
                  dataIndex: 'is_enabled',
                  key: 'is_enabled',
                  render: (v: boolean) => (
                    <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>
                  ),
                },
                {
                  title: '上次运行',
                  dataIndex: 'last_run_at',
                  key: 'last_run_at',
                  render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: ReportSchedule) => (
                    <Space>
                      <Button size="small" type="link">
                        编辑
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        danger
                        onClick={async () => {
                          try {
                            await reportScheduleApi.delete(record.id)
                            message.success('删除成功')
                            loadSchedules()
                          } catch (e: any) {
                            message.error('删除失败')
                          }
                        }}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="创建定时推送任务"
        open={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={scheduleForm} layout="vertical" onFinish={handleCreateSchedule}>
          <Form.Item
            name="schedule_name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item
            name="report_type"
            label="报表类型"
            rules={[{ required: true, message: '请选择报表类型' }]}
          >
            <Select placeholder="请选择报表类型">
              <Option value="summary">汇总报表</Option>
              <Option value="by_line">按产线报表</Option>
              <Option value="by_defect">缺陷分布报表</Option>
              <Option value="trend">趋势分析报表</Option>
              <Option value="rework">返工分析报表</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="frequency"
            label="推送频率"
            rules={[{ required: true, message: '请选择推送频率' }]}
          >
            <Select placeholder="请选择推送频率">
              <Option value="hourly">每小时</Option>
              <Option value="daily">每日</Option>
              <Option value="weekly">每周</Option>
              <Option value="monthly">每月</Option>
            </Select>
          </Form.Item>
          <Form.Item name="file_format" label="文件格式">
            <Select defaultValue="excel">
              <Option value="excel">Excel</Option>
              <Option value="csv">CSV</Option>
              <Option value="pdf">PDF</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="recipients"
            label="接收人邮箱"
            rules={[{ required: true, message: '请输入接收人邮箱' }]}
            extra="多个邮箱用逗号分隔"
          >
            <TextArea rows={3} placeholder="例如: manager@example.com, supervisor@example.com" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setScheduleModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}

export default ReportAnalysis
