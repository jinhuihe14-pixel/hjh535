from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
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
