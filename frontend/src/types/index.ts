export interface Product {
  id: number
  product_code: string
  product_name: string
  category?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DefectType {
  id: number
  code: string
  name: string
  category?: string
  severity_level: number
  description?: string
  is_active: boolean
  created_at: string
}

export interface Defect {
  id: number
  inspection_record_id: number
  defect_type_id: number
  defect_type_code: string
  defect_type_name: string
  severity_level: number
  confidence: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  center_x?: number
  center_y?: number
  width?: number
  height?: number
  area?: number
  description?: string
  created_at: string
}

export interface InspectionRecord {
  id: number
  serial_number: string
  product_id?: number
  product_code?: string
  line_number?: string
  workstation?: string
  operator?: string
  image_path?: string
  result: string
  severity_level: number
  defect_count: number
  inspection_time: string
  processing_time: number
  is_synced: boolean
  batch_no?: string
  shift?: string
  remarks?: string
  defects: Defect[]
}

export interface ProductionLine {
  id: number
  line_code: string
  line_name: string
  status: string
  plc_address?: string
  camera_config?: string
  speed: number
  is_online: boolean
  last_heartbeat: string
  created_at: string
}

export interface Alert {
  id: number
  alert_type: string
  level: string
  title: string
  content?: string
  line_number?: string
  is_read: boolean
  is_handled: boolean
  handled_by?: string
  handled_at?: string
  created_at: string
}

export interface SystemConfig {
  id: number
  config_key: string
  config_value: string
  description?: string
  updated_at: string
}

export interface DetectionResult {
  serial_number: string
  product_code: string
  result: string
  severity_level: number
  defect_count: number
  processing_time: number
  defects: DefectBase[]
  image_path?: string
  timestamp: string
}

export interface DefectBase {
  defect_type_code: string
  defect_type_name: string
  severity_level: number
  confidence: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  center_x?: number
  center_y?: number
  width?: number
  height?: number
  area?: number
  description?: string
}

export interface StatisticsSummary {
  total_count: number
  pass_count: number
  rework_count: number
  fail_count: number
  pass_rate: number
  defect_distribution: { code: string; name: string; count: number }[]
  top_defects: { code: string; name: string; count: number }[]
  trend_data: { time: string; total: number; pass: number; fail: number }[]
}
