import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Select, Statistic, Table, Tag, Spin } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { statisticsApi, defectTypeApi } from '../services/api'
import type { StatisticsSummary, DefectType } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState('day')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StatisticsSummary | null>(null)
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [summary, types] = await Promise.all([
        statisticsApi.getSummary({ period }),
        defectTypeApi.getList(),
      ])
      setData(summary)
      setDefectTypes(types)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [period])

  const getTrendOption = () => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['检测总数', '合格数', '不良数'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.trend_data.map((d) => d.time),
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '检测总数',
          type: 'line',
          data: data.trend_data.map((d) => d.total),
          smooth: true,
        },
        {
          name: '合格数',
          type: 'line',
          data: data.trend_data.map((d) => d.pass),
          smooth: true,
          lineStyle: { color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '不良数',
          type: 'line',
          data: data.trend_data.map((d) => d.fail),
          smooth: true,
          lineStyle: { color: '#ff4d4f' },
          itemStyle: { color: '#ff4d4f' },
        },
      ],
    }
  }

  const getDefectOption = () => {
    if (!data) return {}
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
          data: data.defect_distribution.map((d) => ({ value: d.count, name: d.name })),
        },
      ],
    }
  }

  const topDefectColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Tag color={index < 3 ? 'red' : 'orange'}>
          {index + 1}
        </Tag>
      ),
    },
    { title: '缺陷类型', dataIndex: 'name', key: 'name' },
    { title: '缺陷数量', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => a.count - b.count },
    {
      title: '严重等级',
      key: 'severity',
      render: (_: any, record: any) => {
        const dt = defectTypes.find((d) => d.code === record.code)
        const level = dt?.severity_level || 2
        const colors: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' }
        const labels: Record<number, string> = { 1: '轻微', 2: '一般', 3: '严重' }
        return <Tag color={colors[level]}>{labels[level]}</Tag>
      },
    },
  ]

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Select value={period} onChange={setPeriod} style={{ width: 120 }}>
          <Option value="day">今日</Option>
          <Option value="week">本周</Option>
          <Option value="month">本月</Option>
        </Select>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="检测总数"
              value={data?.total_count || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="合格数"
              value={data?.pass_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="返工数"
              value={data?.rework_count || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="报废数"
              value={data?.fail_count || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card title="检测趋势">
            <ReactECharts option={getTrendOption()} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="合格率">
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#52c41a' }}>
                {data?.pass_rate?.toFixed(2) || 0}%
              </div>
              <div style={{ color: '#999', marginTop: 8 }}>
                总检测 {data?.total_count || 0} 件
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="缺陷分布">
            <ReactECharts option={getDefectOption()} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top 缺陷类型">
            <Table
              dataSource={data?.top_defects || []}
              columns={topDefectColumns}
              rowKey="code"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  )
}

export default Dashboard
