from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_code = Column(String(50), unique=True, index=True, nullable=False)
    product_name = Column(String(100), nullable=False)
    category = Column(String(50))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection_records = relationship("InspectionRecord", back_populates="product")
    defect_configs = relationship("DefectConfig", back_populates="product")


class DefectType(Base):
    __tablename__ = "defect_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    severity_level = Column(Integer, default=2)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    defects = relationship("Defect", back_populates="defect_type")


class DefectConfig(Base):
    __tablename__ = "defect_configs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    defect_type_id = Column(Integer, ForeignKey("defect_types.id"), nullable=False)
    min_size = Column(Float, default=0)
    max_count = Column(Integer, default=10)
    severity_override = Column(Integer)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="defect_configs")


class InspectionRecord(Base):
    __tablename__ = "inspection_records"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    product_code = Column(String(50))
    line_number = Column(String(50))
    workstation = Column(String(50))
    operator = Column(String(50))
    image_path = Column(String(500))
    result = Column(String(20), nullable=False)
    severity_level = Column(Integer, default=0)
    defect_count = Column(Integer, default=0)
    inspection_time = Column(DateTime, default=datetime.utcnow)
    processing_time = Column(Float, default=0)
    is_synced = Column(Boolean, default=True)
    batch_no = Column(String(50))
    shift = Column(String(20))
    remarks = Column(Text)

    product = relationship("Product", back_populates="inspection_records")
    defects = relationship("Defect", back_populates="inspection_record", cascade="all, delete-orphan")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    inspection_record_id = Column(Integer, ForeignKey("inspection_records.id"), nullable=False)
    defect_type_id = Column(Integer, ForeignKey("defect_types.id"), nullable=False)
    defect_type_code = Column(String(50))
    defect_type_name = Column(String(100))
    severity_level = Column(Integer, default=2)
    confidence = Column(Float, default=0)
    x1 = Column(Float)
    y1 = Column(Float)
    x2 = Column(Float)
    y2 = Column(Float)
    center_x = Column(Float)
    center_y = Column(Float)
    width = Column(Float)
    height = Column(Float)
    area = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    inspection_record = relationship("InspectionRecord", back_populates="defects")
    defect_type = relationship("DefectType", back_populates="defects")


class ProductionLine(Base):
    __tablename__ = "production_lines"

    id = Column(Integer, primary_key=True, index=True)
    line_code = Column(String(50), unique=True, index=True, nullable=False)
    line_name = Column(String(100), nullable=False)
    status = Column(String(20), default="running")
    plc_address = Column(String(100))
    camera_config = Column(Text)
    speed = Column(Float, default=60)
    is_online = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False)
    level = Column(String(20), default="warning")
    title = Column(String(200), nullable=False)
    content = Column(Text)
    line_number = Column(String(50))
    is_read = Column(Boolean, default=False)
    is_handled = Column(Boolean, default=False)
    handled_by = Column(String(50))
    handled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, index=True, nullable=False)
    config_value = Column(Text)
    description = Column(String(500))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    sync_type = Column(String(50), nullable=False)
    direction = Column(String(20), nullable=False)
    record_count = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_code = Column(String(50), unique=True, index=True, nullable=False)
    version_name = Column(String(100), nullable=False)
    description = Column(Text)
    model_path = Column(String(500))
    is_active = Column(Boolean, default=False)
    accuracy = Column(Float, default=0)
    precision = Column(Float, default=0)
    recall = Column(Float, default=0)
    f1_score = Column(Float, default=0)
    training_samples = Column(Integer, default=0)
    training_time = Column(Float, default=0)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    rolled_back_at = Column(DateTime)


class TrainingSample(Base):
    __tablename__ = "training_samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_type = Column(String(20), nullable=False)
    image_path = Column(String(500), nullable=False)
    defect_type_code = Column(String(50))
    defect_type_name = Column(String(100))
    product_code = Column(String(50))
    annotations = Column(JSON)
    is_annotated = Column(Boolean, default=False)
    is_used = Column(Boolean, default=False)
    source = Column(String(50), default="manual")
    uploaded_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class TrainingTask(Base):
    __tablename__ = "training_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(100), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="pending")
    model_version_id = Column(Integer)
    model_version_code = Column(String(50))
    sample_count = Column(Integer, default=0)
    epochs = Column(Integer, default=10)
    learning_rate = Column(Float, default=0.001)
    batch_size = Column(Integer, default=16)
    progress = Column(Integer, default=0)
    accuracy = Column(Float, default=0)
    loss = Column(Float, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class ReworkRecord(Base):
    __tablename__ = "rework_records"

    id = Column(Integer, primary_key=True, index=True)
    original_serial_number = Column(String(100), nullable=False, index=True)
    reworked_serial_number = Column(String(100), unique=True, index=True, nullable=False)
    product_code = Column(String(50))
    line_number = Column(String(50))
    workstation = Column(String(50))
    rework_worker = Column(String(50))
    original_defect_count = Column(Integer, default=0)
    original_result = Column(String(20))
    rework_result = Column(String(20))
    rework_defect_count = Column(Integer, default=0)
    rework_description = Column(Text)
    is_passed = Column(Boolean, default=False)
    rework_time = Column(DateTime, default=datetime.utcnow)
    inspection_time = Column(DateTime)


class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id = Column(Integer, primary_key=True, index=True)
    schedule_name = Column(String(100), nullable=False)
    report_type = Column(String(50), nullable=False)
    frequency = Column(String(20), default="daily")
    cron_expression = Column(String(100))
    filters = Column(JSON)
    recipients = Column(JSON)
    file_format = Column(String(20), default="excel")
    is_enabled = Column(Boolean, default=True)
    last_run_at = Column(DateTime)
    last_run_status = Column(String(20))
    created_by = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BatchAlertConfig(Base):
    __tablename__ = "batch_alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_name = Column(String(100), nullable=False)
    line_number = Column(String(50))
    defect_type_code = Column(String(50))
    threshold_count = Column(Integer, default=5)
    time_window_minutes = Column(Integer, default=10)
    severity_level = Column(Integer, default=2)
    alert_level = Column(String(20), default="critical")
    sound_alert = Column(Boolean, default=True)
    light_alert = Column(Boolean, default=True)
    notify_channels = Column(JSON)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BatchAlertRecord(Base):
    __tablename__ = "batch_alert_records"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("batch_alert_configs.id"))
    alert_code = Column(String(50), unique=True, index=True, nullable=False)
    line_number = Column(String(50))
    defect_type_code = Column(String(50))
    defect_type_name = Column(String(100))
    defect_count = Column(Integer, default=0)
    time_window_minutes = Column(Integer, default=10)
    threshold_count = Column(Integer, default=5)
    alert_level = Column(String(20), default="critical")
    status = Column(String(20), default="active")
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(50))
    resolution_notes = Column(Text)
    affected_serials = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    config = relationship("BatchAlertConfig")


class MESConfig(Base):
    __tablename__ = "mes_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_name = Column(String(100), nullable=False)
    mes_type = Column(String(50), default="standard")
    base_url = Column(String(500))
    api_key = Column(String(200))
    username = Column(String(100))
    password = Column(String(100))
    sync_direction = Column(String(20), default="both")
    sync_interval_minutes = Column(Integer, default=30)
    is_enabled = Column(Boolean, default=False)
    last_sync_at = Column(DateTime)
    last_sync_status = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OfflineSyncQueue(Base):
    __tablename__ = "offline_sync_queue"

    id = Column(Integer, primary_key=True, index=True)
    data_type = Column(String(50), nullable=False)
    data_payload = Column(JSON, nullable=False)
    priority = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    synced_at = Column(DateTime)
    device_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)


class DataArchiveConfig(Base):
    __tablename__ = "data_archive_configs"

    id = Column(Integer, primary_key=True, index=True)
    config_name = Column(String(100), nullable=False)
    data_type = Column(String(50), nullable=False)
    retention_days = Column(Integer, default=90)
    archive_after_days = Column(Integer, default=30)
    is_enabled = Column(Boolean, default=True)
    last_archive_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
