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
  ModelVersion,
  TrainingSample,
  TrainingTask,
  ReworkRecord,
  ReworkStatistics,
  ReportSchedule,
  BatchAlertConfig,
  BatchAlertRecord,
  MESConfig,
  DataArchiveConfig,
  MultiDimensionReport,
  TrendReport,
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
  }) => api.get<StatisticsSummary>('/statistics/summary', { params }).then((r) => r.data),
}

export const reportApi = {
  getMultiDimension: (params?: {
    dimension?: string
    start_time?: string
    end_time?: string
    product_code?: string
    line_number?: string
  }) => api.get<MultiDimensionReport>('/reports/multi-dimension', { params }).then((r) => r.data),

  getTrend: (params?: {
    period?: string
    metric?: string
    product_code?: string
    line_number?: string
    defect_type_code?: string
  }) => api.get<TrendReport>('/reports/trend', { params }).then((r) => r.data),

  export: (params?: {
    report_type?: string
    format?: string
    start_time?: string
    end_time?: string
    product_code?: string
    line_number?: string
  }) => api.get('/reports/export', { params, responseType: 'blob' }),
}

export const reworkApi = {
  getList: (params?: {
    skip?: number
    limit?: number
    product_code?: string
    line_number?: string
    is_passed?: boolean
  }) => api.get<ReworkRecord[]>('/rework-records', { params }).then((r) => r.data),

  create: (data: Partial<ReworkRecord>) =>
    api.post<ReworkRecord>('/rework-records', data).then((r) => r.data),

  inspect: (id: number, data: Partial<ReworkRecord>) =>
    api.put<ReworkRecord>(`/rework-records/${id}/inspect`, data).then((r) => r.data),

  getStatistics: (params?: {
    period?: string
    product_code?: string
  }) => api.get<ReworkStatistics>('/rework-statistics', { params }).then((r) => r.data),
}

export const reportScheduleApi = {
  getList: (params?: { skip?: number; limit?: number }) =>
    api.get<ReportSchedule[]>('/report-schedules', { params }).then((r) => r.data),

  create: (data: Partial<ReportSchedule>) =>
    api.post<ReportSchedule>('/report-schedules', data).then((r) => r.data),

  update: (id: number, data: Partial<ReportSchedule>) =>
    api.put<ReportSchedule>(`/report-schedules/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/report-schedules/${id}`).then((r) => r.data),
}

export const modelApi = {
  getVersions: (params?: { skip?: number; limit?: number }) =>
    api.get<ModelVersion[]>('/model-versions', { params }).then((r) => r.data),

  getActive: () => api.get<ModelVersion>('/model-versions/active').then((r) => r.data),

  activate: (id: number) =>
    api.post<ModelVersion>(`/model-versions/${id}/activate`).then((r) => r.data),

  rollback: (id: number) =>
    api.post<ModelVersion>(`/model-versions/${id}/rollback`).then((r) => r.data),
}

export const trainingSampleApi = {
  getList: (params?: {
    skip?: number
    limit?: number
    sample_type?: string
    defect_type_code?: string
    is_annotated?: boolean
    is_used?: boolean
  }) => api.get<TrainingSample[]>('/training-samples', { params }).then((r) => r.data),

  upload: (file: File, params?: {
    sample_type?: string
    defect_type_code?: string
    defect_type_name?: string
    product_code?: string
    uploaded_by?: string
  }) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<TrainingSample>('/training-samples/upload', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  annotate: (id: number, data: Partial<TrainingSample>) =>
    api.put<TrainingSample>(`/training-samples/${id}/annotate`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/training-samples/${id}`).then((r) => r.data),
}

export const trainingTaskApi = {
  getList: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get<TrainingTask[]>('/training-tasks', { params }).then((r) => r.data),

  get: (id: number) => api.get<TrainingTask>(`/training-tasks/${id}`).then((r) => r.data),

  create: (data: { task_name: string; description?: string; epochs?: number; learning_rate?: number; batch_size?: number; sample_ids?: number[] }) =>
    api.post<TrainingTask>('/training-tasks', data).then((r) => r.data),
}

export const batchAlertApi = {
  getConfigs: (params?: { skip?: number; limit?: number }) =>
    api.get<BatchAlertConfig[]>('/batch-alert-configs', { params }).then((r) => r.data),

  createConfig: (data: Partial<BatchAlertConfig>) =>
    api.post<BatchAlertConfig>('/batch-alert-configs', data).then((r) => r.data),

  updateConfig: (id: number, data: Partial<BatchAlertConfig>) =>
    api.put<BatchAlertConfig>(`/batch-alert-configs/${id}`, data).then((r) => r.data),

  deleteConfig: (id: number) => api.delete(`/batch-alert-configs/${id}`).then((r) => r.data),

  getRecords: (params?: {
    skip?: number
    limit?: number
    status?: string
    alert_level?: string
  }) => api.get<BatchAlertRecord[]>('/batch-alert-records', { params }).then((r) => r.data),

  resolve: (id: number, resolved_by?: string, resolution_notes?: string) =>
    api.put<BatchAlertRecord>(`/batch-alert-records/${id}/resolve`, null, {
      params: { resolved_by, resolution_notes },
    }).then((r) => r.data),
}

export const mesApi = {
  getConfigs: (params?: { skip?: number; limit?: number }) =>
    api.get<MESConfig[]>('/mes-configs', { params }).then((r) => r.data),

  createConfig: (data: Partial<MESConfig>) =>
    api.post<MESConfig>('/mes-configs', data).then((r) => r.data),

  updateConfig: (id: number, data: Partial<MESConfig>) =>
    api.put<MESConfig>(`/mes-configs/${id}`, data).then((r) => r.data),

  deleteConfig: (id: number) => api.delete(`/mes-configs/${id}`).then((r) => r.data),

  sync: (direction?: string) =>
    api.post('/mes/sync', null, { params: { direction } }).then((r) => r.data),
}

export const archiveApi = {
  getConfigs: () => api.get<DataArchiveConfig[]>('/archive-configs').then((r) => r.data),

  updateConfig: (id: number, data: Partial<DataArchiveConfig>) =>
    api.put<DataArchiveConfig>(`/archive-configs/${id}`, data).then((r) => r.data),
}

export const offlineSyncApi = {
  getQueue: (params?: {
    skip?: number
    limit?: number
    status?: string
    data_type?: string
  }) => api.get('/offline-sync-queue', { params }).then((r) => r.data),

  batchAdd: (items: any[]) =>
    api.post('/offline-sync-queue/batch', items).then((r) => r.data),

  process: () => api.post('/offline-sync-queue/process').then((r) => r.data),
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
