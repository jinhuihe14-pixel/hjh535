import React, { useEffect, useState } from 'react'
import {
  Table,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tag,
  InputNumber,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { defectTypeApi } from '../services/api'
import type { DefectType } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const DefectTypeManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DefectType[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<DefectType | null>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await defectTypeApi.getList()
      setData(list)
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

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: DefectType) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await defectTypeApi.update(editingItem.id, values)
        message.success('更新成功')
      } else {
        await defectTypeApi.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (e: any) {
      if (e.errorFields) return
      message.error('操作失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const getSeverityColor = (level: number) => {
    const colors: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' }
    return colors[level] || 'default'
  }

  const getSeverityText = (level: number) => {
    const texts: Record<number, string> = { 1: '轻微', 2: '一般', 3: '严重' }
    return texts[level] || '未知'
  }

  const columns: ColumnsType<DefectType> = [
    {
      title: '缺陷编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '缺陷名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => category || '-',
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
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="缺陷类型管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增缺陷类型
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ x: 900 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑缺陷类型' : '新增缺陷类型'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="缺陷编码"
            rules={[{ required: true, message: '请输入缺陷编码' }]}
          >
            <Input placeholder="请输入缺陷编码" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="name"
            label="缺陷名称"
            rules={[{ required: true, message: '请输入缺陷名称' }]}
          >
            <Input placeholder="请输入缺陷名称" />
          </Form.Item>
          <Form.Item name="category" label="类别">
            <Select placeholder="请选择类别" allowClear>
              <Option value="surface">表面缺陷</Option>
              <Option value="appearance">外观缺陷</Option>
              <Option value="structure">结构缺陷</Option>
              <Option value="edge">边缘缺陷</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="severity_level"
            label="严重等级"
            rules={[{ required: true, message: '请选择严重等级' }]}
          >
            <Select placeholder="请选择严重等级">
              <Option value={1}>1 - 轻微</Option>
              <Option value={2}>2 - 一般</Option>
              <Option value={3}>3 - 严重</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入缺陷描述" />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DefectTypeManagement
