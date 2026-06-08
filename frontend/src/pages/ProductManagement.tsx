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
  Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { productApi } from '../services/api'
import type { Product } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const ProductManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Product[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await productApi.getList()
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

  const handleEdit = (record: Product) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await productApi.delete(id)
      message.success('删除成功')
      loadData()
    } catch (e: any) {
      message.error('删除失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await productApi.update(editingItem.id, values)
        message.success('更新成功')
      } else {
        await productApi.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData()
    } catch (e: any) {
      if (e.errorFields) return
      message.error('操作失败: ' + (e.response?.data?.detail || e.message))
    }
  }

  const columns: ColumnsType<Product> = [
    {
      title: '产品编码',
      dataIndex: 'product_code',
      key: 'product_code',
      width: 150,
    },
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => category || '-',
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
      width: 100,
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
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个产品吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="产品管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增产品
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
        title={editingItem ? '编辑产品' : '新增产品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="product_code"
            label="产品编码"
            rules={[{ required: true, message: '请输入产品编码' }]}
          >
            <Input placeholder="请输入产品编码" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="product_name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item name="category" label="类别">
            <Select placeholder="请选择类别" allowClear>
              <Option value="电子元件">电子元件</Option>
              <Option value="塑胶件">塑胶件</Option>
              <Option value="光学元件">光学元件</Option>
              <Option value="半导体">半导体</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入产品描述" />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProductManagement
