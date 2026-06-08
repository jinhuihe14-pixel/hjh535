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

export interface ModelVersion {
  id: number
  version_code: string
  version_name: string
  description?: string
  model_path?: string
  is_active: boolean
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  training_samples: number
  training_time: number
  created_by?: string
  created_at: string
  rolled_back_at?: string
}

export interface TrainingSample {
  id: number
  sample_type: string
  image_path: string
  defect_type_code?: string
  defect_type_name?: string
  product_code?: string
  annotations?: any
  is_annotated: boolean
  is_used: boolean
  source: string
  uploaded_by?: string
  created_at: string
}

export interface TrainingTask {
  id: number
  task_name: string
  description?: string
  status: string
  model_version_id?: number
  model_version_code?: string
  sample_count: number
  epochs: number
  learning_rate: number
  batch_size: number
  progress: number
  accuracy: number
  loss: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_by?: string
  created_at: string
}

export interface ReworkRecord {
  id: number
  original_serial_number: string
  reworked_serial_number: string
  product_code?: string
  line_number?: string
  workstation?: string
  rework_worker?: string
  original_defect_count: number
  original_result?: string
  rework_result?: string
  rework_defect_count: number
  rework_description?: string
  is_passed: boolean
  rework_time: string
  inspection_time?: string
}

export interface ReworkStatistics {
  total_rework_count: number
  rework_pass_count: number
  rework_fail_count: number
  rework_pass_rate: number
  avg_rework_defect_reduction: number
  by_product: any[]
  by_defect_type: any[]
}

export interface ReportSchedule {
  id: number
  schedule_name: string
  report_type: string
  frequency: string
  cron_expression?: string
  filters?: any
  recipients?: string[]
  file_format: string
  is_enabled: boolean
  last_run_at?: string
  last_run_status?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface BatchAlertConfig {
  id: number
  config_name: string
  line_number?: string
  defect_type_code?: string
  threshold_count: number
  time_window_minutes: number
  severity_level: number
  alert_level: string
  sound_alert: boolean
  light_alert: boolean
  notify_channels?: string[]
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface BatchAlertRecord {
  id: number
  config_id?: number
  alert_code: string
  line_number?: string
  defect_type_code?: string
  defect_type_name?: string
  defect_count: number
  time_window_minutes: number
  threshold_count: number
  alert_level: string
  status: string
  first_seen_at: string
  last_seen_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  affected_serials?: string[]
  created_at: string
}

export interface MESConfig {
  id: number
  config_name: string
  mes_type: string
  base_url?: string
  api_key?: string
  username?: string
  password?: string
  sync_direction: string
  sync_interval_minutes: number
  is_enabled: boolean
  last_sync_at?: string
  last_sync_status?: string
  created_at: string
  updated_at: string
}

export interface DataArchiveConfig {
  id: number
  config_name: string
  data_type: string
  retention_days: number
  archive_after_days: number
  is_enabled: boolean
  last_archive_at?: string
  created_at: string
  updated_at: string
}

export interface MultiDimensionReportItem {
  dimension: string
  dimension_value: string
  dimension_key: string
  total_count: number
  pass_count: number
  rework_count: number
  fail_count: number
  pass_rate: number
  fail_rate: number
  defect_count: number
}

export interface MultiDimensionReport {
  dimension: string
  dimension_key: string
  total_records: number
  data: MultiDimensionReportItem[]
}

export interface TrendReportItem {
  time: string
  value: number
  total_count: number
  pass_count: number
  fail_count: number
  rework_count: number
  defect_count: number
}

export interface TrendReport {
  period: string
  metric: string
  data: TrendReportItem[]
}
