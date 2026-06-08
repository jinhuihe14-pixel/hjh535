from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProductBase(BaseModel):
    product_code: str
    product_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DefectTypeBase(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    severity_level: Optional[int] = 2
    description: Optional[str] = None
    is_active: Optional[bool] = True


class DefectTypeCreate(DefectTypeBase):
    pass


class DefectTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    severity_level: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DefectType(DefectTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DefectBase(BaseModel):
    defect_type_id: int
    defect_type_code: str
    defect_type_name: str
    severity_level: int = 2
    confidence: float = 0
    x1: Optional[float] = None
    y1: Optional[float] = None
    x2: Optional[float] = None
    y2: Optional[float] = None
    center_x: Optional[float] = None
    center_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    area: Optional[float] = None
    description: Optional[str] = None


class DefectCreate(DefectBase):
    pass


class Defect(DefectBase):
    id: int
    inspection_record_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionRecordBase(BaseModel):
    serial_number: str
    product_id: Optional[int] = None
    product_code: Optional[str] = None
    line_number: Optional[str] = None
    workstation: Optional[str] = None
    operator: Optional[str] = None
    image_path: Optional[str] = None
    result: str
    severity_level: int = 0
    defect_count: int = 0
    processing_time: Optional[float] = 0
    batch_no: Optional[str] = None
    shift: Optional[str] = None
    remarks: Optional[str] = None


class InspectionRecordCreate(InspectionRecordBase):
    defects: Optional[List[DefectCreate]] = []


class InspectionRecordUpdate(BaseModel):
    remarks: Optional[str] = None


class InspectionRecord(InspectionRecordBase):
    id: int
    inspection_time: datetime
    is_synced: bool
    defects: List[Defect] = []

    class Config:
        from_attributes = True


class ProductionLineBase(BaseModel):
    line_code: str
    line_name: str
    status: Optional[str] = "running"
    plc_address: Optional[str] = None
    camera_config: Optional[str] = None
    speed: Optional[float] = 60
    is_online: Optional[bool] = True


class ProductionLineCreate(ProductionLineBase):
    pass


class ProductionLineUpdate(BaseModel):
    line_name: Optional[str] = None
    status: Optional[str] = None
    plc_address: Optional[str] = None
    camera_config: Optional[str] = None
    speed: Optional[float] = None
    is_online: Optional[bool] = None


class ProductionLine(ProductionLineBase):
    id: int
    last_heartbeat: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DetectionResult(BaseModel):
    serial_number: str
    product_code: str
    result: str
    severity_level: int
    defect_count: int
    processing_time: float
    defects: List[DefectBase]
    image_path: Optional[str] = None
    timestamp: datetime


class StatisticsData(BaseModel):
    total_count: int
    pass_count: int
    fail_count: int
    pass_rate: float
    defect_distribution: List[dict]
    top_defects: List[dict]
    trend_data: List[dict]


class AlertBase(BaseModel):
    alert_type: str
    level: str = "warning"
    title: str
    content: Optional[str] = None
    line_number: Optional[str] = None


class AlertCreate(AlertBase):
    pass


class Alert(AlertBase):
    id: int
    is_read: bool
    is_handled: bool
    handled_by: Optional[str] = None
    handled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SystemConfigBase(BaseModel):
    config_key: str
    config_value: str
    description: Optional[str] = None


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfigUpdate(BaseModel):
    config_value: str
    description: Optional[str] = None


class SystemConfig(SystemConfigBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


class ModelVersionBase(BaseModel):
    version_code: str
    version_name: str
    description: Optional[str] = None
    model_path: Optional[str] = None
    is_active: Optional[bool] = False
    accuracy: Optional[float] = 0
    precision: Optional[float] = 0
    recall: Optional[float] = 0
    f1_score: Optional[float] = 0
    training_samples: Optional[int] = 0
    training_time: Optional[float] = 0
    created_by: Optional[str] = None


class ModelVersionCreate(ModelVersionBase):
    pass


class ModelVersionUpdate(BaseModel):
    version_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ModelVersion(ModelVersionBase):
    id: int
    created_at: datetime
    rolled_back_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainingSampleBase(BaseModel):
    sample_type: str
    image_path: str
    defect_type_code: Optional[str] = None
    defect_type_name: Optional[str] = None
    product_code: Optional[str] = None
    annotations: Optional[dict] = None
    is_annotated: Optional[bool] = False
    source: Optional[str] = "manual"
    uploaded_by: Optional[str] = None


class TrainingSampleCreate(TrainingSampleBase):
    pass


class TrainingSampleUpdate(BaseModel):
    annotations: Optional[dict] = None
    is_annotated: Optional[bool] = None
    defect_type_code: Optional[str] = None
    defect_type_name: Optional[str] = None


class TrainingSample(TrainingSampleBase):
    id: int
    is_used: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TrainingTaskBase(BaseModel):
    task_name: str
    description: Optional[str] = None
    epochs: Optional[int] = 10
    learning_rate: Optional[float] = 0.001
    batch_size: Optional[int] = 16
    created_by: Optional[str] = None


class TrainingTaskCreate(TrainingTaskBase):
    sample_ids: Optional[List[int]] = []


class TrainingTaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    accuracy: Optional[float] = None
    loss: Optional[float] = None
    error_message: Optional[str] = None


class TrainingTask(TrainingTaskBase):
    id: int
    status: str
    model_version_id: Optional[int] = None
    model_version_code: Optional[str] = None
    sample_count: int
    progress: int
    accuracy: float
    loss: float
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReworkRecordBase(BaseModel):
    original_serial_number: str
    reworked_serial_number: str
    product_code: Optional[str] = None
    line_number: Optional[str] = None
    workstation: Optional[str] = None
    rework_worker: Optional[str] = None
    original_defect_count: Optional[int] = 0
    original_result: Optional[str] = None
    rework_description: Optional[str] = None


class ReworkRecordCreate(ReworkRecordBase):
    pass


class ReworkRecordUpdate(BaseModel):
    rework_result: Optional[str] = None
    rework_defect_count: Optional[int] = None
    is_passed: Optional[bool] = None
    inspection_time: Optional[datetime] = None


class ReworkRecord(ReworkRecordBase):
    id: int
    rework_result: Optional[str] = None
    rework_defect_count: int
    is_passed: bool
    rework_time: datetime
    inspection_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportScheduleBase(BaseModel):
    schedule_name: str
    report_type: str
    frequency: Optional[str] = "daily"
    cron_expression: Optional[str] = None
    filters: Optional[dict] = None
    recipients: Optional[List[str]] = None
    file_format: Optional[str] = "excel"
    is_enabled: Optional[bool] = True
    created_by: Optional[str] = None


class ReportScheduleCreate(ReportScheduleBase):
    pass


class ReportScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    frequency: Optional[str] = None
    cron_expression: Optional[str] = None
    filters: Optional[dict] = None
    recipients: Optional[List[str]] = None
    file_format: Optional[str] = None
    is_enabled: Optional[bool] = None


class ReportSchedule(ReportScheduleBase):
    id: int
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchAlertConfigBase(BaseModel):
    config_name: str
    line_number: Optional[str] = None
    defect_type_code: Optional[str] = None
    threshold_count: Optional[int] = 5
    time_window_minutes: Optional[int] = 10
    severity_level: Optional[int] = 2
    alert_level: Optional[str] = "critical"
    sound_alert: Optional[bool] = True
    light_alert: Optional[bool] = True
    notify_channels: Optional[List[str]] = None
    is_enabled: Optional[bool] = True


class BatchAlertConfigCreate(BatchAlertConfigBase):
    pass


class BatchAlertConfigUpdate(BaseModel):
    config_name: Optional[str] = None
    threshold_count: Optional[int] = None
    time_window_minutes: Optional[int] = None
    alert_level: Optional[str] = None
    sound_alert: Optional[bool] = None
    light_alert: Optional[bool] = None
    is_enabled: Optional[bool] = None


class BatchAlertConfig(BatchAlertConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchAlertRecordBase(BaseModel):
    config_id: Optional[int] = None
    alert_code: str
    line_number: Optional[str] = None
    defect_type_code: Optional[str] = None
    defect_type_name: Optional[str] = None
    defect_count: Optional[int] = 0
    time_window_minutes: Optional[int] = 10
    threshold_count: Optional[int] = 5
    alert_level: Optional[str] = "critical"
    affected_serials: Optional[List[str]] = None


class BatchAlertRecordCreate(BatchAlertRecordBase):
    pass


class BatchAlertRecordUpdate(BaseModel):
    status: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None


class BatchAlertRecord(BatchAlertRecordBase):
    id: int
    status: str
    first_seen_at: datetime
    last_seen_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MESConfigBase(BaseModel):
    config_name: str
    mes_type: Optional[str] = "standard"
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    sync_direction: Optional[str] = "both"
    sync_interval_minutes: Optional[int] = 30
    is_enabled: Optional[bool] = False


class MESConfigCreate(MESConfigBase):
    pass


class MESConfigUpdate(BaseModel):
    config_name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    is_enabled: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None


class MESConfig(MESConfigBase):
    id: int
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OfflineSyncQueueBase(BaseModel):
    data_type: str
    data_payload: dict
    priority: Optional[int] = 0
    device_id: Optional[str] = None


class OfflineSyncQueueCreate(OfflineSyncQueueBase):
    pass


class OfflineSyncQueueUpdate(BaseModel):
    status: Optional[str] = None
    retry_count: Optional[int] = None
    error_message: Optional[str] = None
    synced_at: Optional[datetime] = None


class OfflineSyncQueue(OfflineSyncQueueBase):
    id: int
    status: str
    retry_count: int
    error_message: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DataArchiveConfigBase(BaseModel):
    config_name: str
    data_type: str
    retention_days: Optional[int] = 90
    archive_after_days: Optional[int] = 30
    is_enabled: Optional[bool] = True


class DataArchiveConfigCreate(DataArchiveConfigBase):
    pass


class DataArchiveConfigUpdate(BaseModel):
    config_name: Optional[str] = None
    retention_days: Optional[int] = None
    archive_after_days: Optional[int] = None
    is_enabled: Optional[bool] = None


class DataArchiveConfig(DataArchiveConfigBase):
    id: int
    last_archive_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MultiDimensionReport(BaseModel):
    dimension: str
    dimension_value: str
    total_count: int
    pass_count: int
    rework_count: int
    fail_count: int
    pass_rate: float
    defect_count: int


class ReworkStatistics(BaseModel):
    total_rework_count: int
    rework_pass_count: int
    rework_fail_count: int
    rework_pass_rate: float
    avg_rework_defect_reduction: float
    by_product: List[dict]
    by_defect_type: List[dict]
