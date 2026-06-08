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
