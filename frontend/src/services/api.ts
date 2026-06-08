import axios from 'axios'
import type {
  Product,
  DefectType,
  InspectionRecord,
  ProductionLine,
  Alert,
  SystemConfig,
  DetectionResult,
  StatisticsSummary,
} from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const productApi = {
  getList: (params?: { is_active?: boolean; skip?: number; limit?: number }) =>
    api.get<Product[]>('/products', { params }).then((r) => r.data),
  get: (id: number) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: Partial<Product>) =>
    api.post<Product>('/products', data).then((r) => r.data),
  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/products/${id}`).then((r) => r.data),
}

export const defectTypeApi = {
  getList: (params?: { is_active?: boolean; skip?: number; limit?: number }) =>
    api.get<DefectType[]>('/defect-types', { params }).then((r) => r.data),
  get: (id: number) => api.get<DefectType>(`/defect-types/${id}`).then((r) => r.data),
  create: (data: Partial<DefectType>) =>
    api.post<DefectType>('/defect-types', data).then((r) => r.data),
  update: (id: number, data: Partial<DefectType>) =>
    api.put<DefectType>(`/defect-types/${id}`, data).then((r) => r.data),
}

export const inspectionApi = {
  getList: (params?: {
    result?: string
    product_code?: string
    line_number?: string
    start_time?: string
    end_time?: string
    defect_type_code?: string
    severity_level?: number
    skip?: number
    limit?: number
  }) => api.get<InspectionRecord[]>('/inspection-records', { params }).then((r) => r.data),
  get: (id: number) =>
    api.get<InspectionRecord>(`/inspection-records/${id}`).then((r) => r.data),
  getBySn: (sn: string) =>
    api.get<InspectionRecord>(`/inspection-records/sn/${sn}`).then((r) => r.data),
  detect: (file: File, params?: {
    product_code?: string
    serial_number?: string
    line_number?: string
    workstation?: string
    operator?: string
  }) => {
    const formData = new FormData()
    formData.append('file', file)
    return api
      .post<DetectionResult>('/detection/detect', formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}

export const productionLineApi = {
  getList: () => api.get<ProductionLine[]>('/production-lines').then((r) => r.data),
  get: (id: number) =>
    api.get<ProductionLine>(`/production-lines/${id}`).then((r) => r.data),
  control: (id: number, action: string) =>
    api.post(`/production-lines/${id}/control`, null, { params: { action } }).then((r) => r.data),
}

export const alertApi = {
  getList: (params?: {
    level?: string
    is_read?: boolean
    is_handled?: boolean
    skip?: number
    limit?: number
  }) => api.get<Alert[]>('/alerts', { params }).then((r) => r.data),
  markRead: (id: number) => api.put(`/alerts/${id}/read`).then((r) => r.data),
  handle: (id: number, handled_by?: string) =>
    api.put(`/alerts/${id}/handle`, null, { params: { handled_by } }).then((r) => r.data),
}

export const statisticsApi = {
  getSummary: (params?: {
    period?: string
    product_code?: string
    line_number?: string
    start_time?: string
    end_time?: string
    defect_type_code?: string
    severity_level?: number
  }) => api.get<StatisticsSummary>('/statistics/summary', { params }).then((r) => r.data),
}

export const systemConfigApi = {
  getList: () => api.get<SystemConfig[]>('/system-configs').then((r) => r.data),
  get: (key: string) =>
    api.get<SystemConfig>(`/system-configs/${key}`).then((r) => r.data),
  update: (key: string, config_value: string, description?: string) =>
    api.put<SystemConfig>(`/system-configs/${key}`, { config_value, description }).then((r) => r.data),
}

export const healthCheck = () => api.get('/health').then((r) => r.data)

export default api
