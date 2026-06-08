import os
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import shutil
import uuid
import json

from .database import engine, get_db, Base
from . import models, schemas
from .detection.engine import detection_engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="产品外观缺陷智能检测系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
IMAGES_DIR = os.path.join(STATIC_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


def init_defect_types(db: Session):
    existing = db.query(models.DefectType).count()
    if existing > 0:
        return

    defect_types = [
        {"code": "scratch", "name": "划痕", "category": "surface", "severity_level": 2, "description": "表面线性划伤缺陷"},
        {"code": "dent", "name": "凹坑", "category": "surface", "severity_level": 2, "description": "表面凹陷缺陷"},
        {"code": "stain", "name": "污渍", "category": "surface", "severity_level": 1, "description": "表面污渍污染"},
        {"code": "discoloration", "name": "色差", "category": "appearance", "severity_level": 2, "description": "颜色差异缺陷"},
        {"code": "lack_material", "name": "缺料", "category": "structure", "severity_level": 3, "description": "材料缺失结构缺陷"},
        {"code": "deformation", "name": "变形", "category": "structure", "severity_level": 3, "description": "形状变形缺陷"},
        {"code": "burr", "name": "毛刺", "category": "edge", "severity_level": 1, "description": "边缘毛刺缺陷"},
        {"code": "crack", "name": "裂纹", "category": "structure", "severity_level": 3, "description": "开裂裂纹缺陷"},
        {"code": "bubble", "name": "气泡", "category": "surface", "severity_level": 1, "description": "内部气泡缺陷"},
        {"code": "foreign_matter", "name": "异物", "category": "surface", "severity_level": 2, "description": "表面异物附着"},
    ]

    for dt in defect_types:
        db_dt = models.DefectType(**dt)
        db.add(db_dt)

    db.commit()


def init_products(db: Session):
    existing = db.query(models.Product).count()
    if existing > 0:
        return

    products = [
        {"product_code": "PCB-A001", "product_name": "精密PCB板A型", "category": "电子元件", "description": "高精度印刷电路板"},
        {"product_code": "PLS-B002", "product_name": "塑料外壳B型", "category": "塑胶件", "description": "电子设备塑料外壳"},
        {"product_code": "LENS-C003", "product_name": "光学镜头组件", "category": "光学元件", "description": "精密光学镜头"},
        {"product_code": "CHIP-D004", "product_name": "芯片封装", "category": "半导体", "description": "集成电路芯片封装"},
    ]

    for p in products:
        db_product = models.Product(**p)
        db.add(db_product)

    db.commit()


def init_production_lines(db: Session):
    existing = db.query(models.ProductionLine).count()
    if existing > 0:
        return

    lines = [
        {"line_code": "LINE-01", "line_name": "1号线", "status": "running", "speed": 60, "plc_address": "192.168.1.101"},
        {"line_code": "LINE-02", "line_name": "2号线", "status": "running", "speed": 55, "plc_address": "192.168.1.102"},
        {"line_code": "LINE-03", "line_name": "3号线", "status": "maintenance", "speed": 0, "plc_address": "192.168.1.103"},
    ]

    for line in lines:
        db_line = models.ProductionLine(**line)
        db.add(db_line)

    db.commit()


def init_system_configs(db: Session):
    existing = db.query(models.SystemConfig).count()
    if existing > 0:
        return

    configs = [
        {"config_key": "detection_threshold", "config_value": "0.7", "description": "缺陷检测置信度阈值"},
        {"config_key": "auto_sort", "config_value": "true", "description": "是否自动分拣不良品"},
        {"config_key": "alert_enabled", "config_value": "true", "description": "是否启用告警"},
        {"config_key": "offline_mode", "config_value": "false", "description": "离线模式开关"},
        {"config_key": "max_defects_rework", "config_value": "3", "description": "返工最大缺陷数"},
        {"config_key": "severity_pass", "config_value": "0", "description": "放行严重等级"},
        {"config_key": "severity_rework", "config_value": "2", "description": "返工严重等级"},
        {"config_key": "severity_scrap", "config_value": "3", "description": "报废严重等级"},
        {"config_key": "batch_warning_enabled", "config_value": "true", "description": "是否启用批量异常预警"},
        {"config_key": "batch_warning_threshold", "config_value": "5", "description": "批量预警阈值（连续N件同类缺陷触发）"},
        {"config_key": "batch_warning_method", "config_value": "popup", "description": "预警方式：popup-页面弹窗，sound-声音提醒，both-两者都有"},
    ]

    for cfg in configs:
        db_cfg = models.SystemConfig(**cfg)
        db.add(db_cfg)

    db.commit()


from .database import SessionLocal
_init_db = SessionLocal()
init_defect_types(_init_db)
init_products(_init_db)
init_production_lines(_init_db)
init_system_configs(_init_db)
_init_db.close()


@app.get("/")
def read_root():
    return {"message": "产品外观缺陷智能检测系统 API", "version": "1.0.0"}


@app.get("/api/products", response_model=List[schemas.Product])
def get_products(skip: int = 0, limit: int = 100, is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if is_active is not None:
        query = query.filter(models.Product.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@app.get("/api/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="产品不存在")
    return product


@app.post("/api/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Product).filter(models.Product.product_code == product.product_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="产品编码已存在")
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.put("/api/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="产品不存在")
    update_data = product.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="产品不存在")
    db.delete(db_product)
    db.commit()
    return {"message": "删除成功"}


@app.get("/api/defect-types", response_model=List[schemas.DefectType])
def get_defect_types(skip: int = 0, limit: int = 100, is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    query = db.query(models.DefectType)
    if is_active is not None:
        query = query.filter(models.DefectType.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@app.get("/api/defect-types/{defect_type_id}", response_model=schemas.DefectType)
def get_defect_type(defect_type_id: int, db: Session = Depends(get_db)):
    defect_type = db.query(models.DefectType).filter(models.DefectType.id == defect_type_id).first()
    if not defect_type:
        raise HTTPException(status_code=404, detail="缺陷类型不存在")
    return defect_type


@app.post("/api/defect-types", response_model=schemas.DefectType)
def create_defect_type(defect_type: schemas.DefectTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.DefectType).filter(models.DefectType.code == defect_type.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="缺陷编码已存在")
    db_dt = models.DefectType(**defect_type.model_dump())
    db.add(db_dt)
    db.commit()
    db.refresh(db_dt)
    return db_dt


@app.put("/api/defect-types/{defect_type_id}", response_model=schemas.DefectType)
def update_defect_type(defect_type_id: int, defect_type: schemas.DefectTypeUpdate, db: Session = Depends(get_db)):
    db_dt = db.query(models.DefectType).filter(models.DefectType.id == defect_type_id).first()
    if not db_dt:
        raise HTTPException(status_code=404, detail="缺陷类型不存在")
    update_data = defect_type.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_dt, key, value)
    db.commit()
    db.refresh(db_dt)
    return db_dt


@app.post("/api/detection/detect", response_model=schemas.DetectionResult)
async def detect_defects(
    file: UploadFile = File(...),
    product_code: str = Query("default"),
    serial_number: Optional[str] = None,
    line_number: Optional[str] = None,
    workstation: Optional[str] = None,
    operator: Optional[str] = None,
    db: Session = Depends(get_db)
):
    import cv2
    import numpy as np

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="无效的图片文件")

    result = detection_engine.detect(image, product_code)

    if not serial_number:
        serial_number = f"SN{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    image_filename = f"{serial_number}.jpg"
    image_path = os.path.join(IMAGES_DIR, image_filename)

    vis_image = detection_engine.visualize_defects(image, result["defects"])
    cv2.imwrite(image_path, vis_image)

    relative_image_path = f"/static/images/{image_filename}"

    product = db.query(models.Product).filter(models.Product.product_code == product_code).first()
    product_id = product.id if product else None

    db_record = models.InspectionRecord(
        serial_number=serial_number,
        product_id=product_id,
        product_code=product_code,
        line_number=line_number,
        workstation=workstation,
        operator=operator,
        image_path=relative_image_path,
        result=result["result"],
        severity_level=result["severity_level"],
        defect_count=result["defect_count"],
        processing_time=result["processing_time"],
        is_synced=True,
        shift=get_current_shift(),
    )
    db.add(db_record)
    db.flush()

    for defect_data in result["defects"]:
        defect_type = db.query(models.DefectType).filter(models.DefectType.code == defect_data["defect_type_code"]).first()
        db_defect = models.Defect(
            inspection_record_id=db_record.id,
            defect_type_id=defect_type.id if defect_type else 0,
            defect_type_code=defect_data["defect_type_code"],
            defect_type_name=defect_data["defect_type_name"],
            severity_level=defect_data["severity_level"],
            confidence=defect_data["confidence"],
            x1=defect_data["x1"],
            y1=defect_data["y1"],
            x2=defect_data["x2"],
            y2=defect_data["y2"],
            center_x=defect_data["center_x"],
            center_y=defect_data["center_y"],
            width=defect_data["width"],
            height=defect_data["height"],
            area=defect_data["area"],
            description=defect_data["description"],
        )
        db.add(db_defect)

    db.commit()
    db.refresh(db_record)

    detection_result = schemas.DetectionResult(
        serial_number=serial_number,
        product_code=product_code,
        result=result["result"],
        severity_level=result["severity_level"],
        defect_count=result["defect_count"],
        processing_time=result["processing_time"],
        defects=[schemas.DefectBase(**d) for d in result["defects"]],
        image_path=relative_image_path,
        timestamp=db_record.inspection_time,
    )

    await manager.broadcast({
        "type": "detection_result",
        "data": json.loads(detection_result.model_dump_json())
    })

    if result["result"] in ["fail", "rework"]:
        alert_level = "critical" if result["result"] == "fail" else "warning"
        db_alert = models.Alert(
            alert_type="defect",
            level=alert_level,
            title=f"检测到{'严重' if result['result'] == 'fail' else ''}不良品",
            content=f"产品{product_code}，序列号{serial_number}，检测到{result['defect_count']}个缺陷",
            line_number=line_number,
        )
        db.add(db_alert)
        db.commit()

        await manager.broadcast({
            "type": "alert",
            "data": {
                "id": db_alert.id,
                "alert_type": db_alert.alert_type,
                "level": db_alert.level,
                "title": db_alert.title,
                "content": db_alert.content,
                "created_at": db_alert.created_at.isoformat(),
            }
        })

    return detection_result


@app.get("/api/inspection-records", response_model=List[schemas.InspectionRecord])
def get_inspection_records(
    skip: int = 0,
    limit: int = 100,
    result: Optional[str] = None,
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    defect_type_code: Optional[str] = None,
    severity_level: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.InspectionRecord)
    if result:
        query = query.filter(models.InspectionRecord.result == result)
    if product_code:
        query = query.filter(models.InspectionRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.InspectionRecord.line_number == line_number)
    if start_time:
        query = query.filter(models.InspectionRecord.inspection_time >= start_time)
    if end_time:
        query = query.filter(models.InspectionRecord.inspection_time <= end_time)

    records = query.order_by(models.InspectionRecord.inspection_time.desc()).all()

    if defect_type_code or severity_level is not None:
        filtered_records = []
        for record in records:
            has_matching_defect = False
            for defect in record.defects:
                match_type = True
                match_severity = True
                if defect_type_code and defect.defect_type_code != defect_type_code:
                    match_type = False
                if severity_level is not None and defect.severity_level != severity_level:
                    match_severity = False
                if match_type and match_severity:
                    has_matching_defect = True
                    break
            if has_matching_defect or (record.defect_count == 0 and not defect_type_code and severity_level is None):
                filtered_records.append(record)
        records = filtered_records

    return records[skip:skip + limit]


@app.get("/api/inspection-records/{record_id}", response_model=schemas.InspectionRecord)
def get_inspection_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.InspectionRecord).filter(models.InspectionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="检测记录不存在")
    return record


@app.get("/api/inspection-records/sn/{serial_number}", response_model=schemas.InspectionRecord)
def get_inspection_record_by_sn(serial_number: str, db: Session = Depends(get_db)):
    record = db.query(models.InspectionRecord).filter(models.InspectionRecord.serial_number == serial_number).first()
    if not record:
        raise HTTPException(status_code=404, detail="检测记录不存在")
    return record


def get_current_shift() -> str:
    hour = datetime.now().hour
    if 8 <= hour < 16:
        return "早班"
    elif 16 <= hour < 24:
        return "中班"
    else:
        return "晚班"


@app.get("/api/statistics/summary")
def get_statistics_summary(
    period: str = Query("day", description="统计周期: day, week, month"),
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    defect_type_code: Optional[str] = None,
    severity_level: Optional[int] = None,
    db: Session = Depends(get_db)
):
    now = datetime.now()
    if not start_time:
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(days=7)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(days=1)

    query = db.query(models.InspectionRecord).filter(models.InspectionRecord.inspection_time >= start_time)
    if end_time:
        query = query.filter(models.InspectionRecord.inspection_time <= end_time)
    if product_code:
        query = query.filter(models.InspectionRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.InspectionRecord.line_number == line_number)

    records = query.all()

    if defect_type_code or severity_level is not None:
        filtered_records = []
        for record in records:
            has_matching_defect = False
            for defect in record.defects:
                match_type = True
                match_severity = True
                if defect_type_code and defect.defect_type_code != defect_type_code:
                    match_type = False
                if severity_level is not None and defect.severity_level != severity_level:
                    match_severity = False
                if match_type and match_severity:
                    has_matching_defect = True
                    break
            if has_matching_defect or (record.defect_count == 0 and not defect_type_code and severity_level is None):
                filtered_records.append(record)
        records = filtered_records

    total_count = len(records)
    pass_count = sum(1 for r in records if r.result == "pass")
    rework_count = sum(1 for r in records if r.result == "rework")
    fail_count = sum(1 for r in records if r.result == "fail")
    pass_rate = (pass_count / total_count * 100) if total_count > 0 else 0

    defect_counts = {}
    for record in records:
        for defect in record.defects:
            code = defect.defect_type_code
            if code not in defect_counts:
                defect_counts[code] = {"code": code, "name": defect.defect_type_name, "count": 0}
            defect_counts[code]["count"] += 1

    defect_distribution = sorted(defect_counts.values(), key=lambda x: x["count"], reverse=True)
    top_defects = defect_distribution[:5]

    trend_data = []
    if period == "day":
        hours = 24
        for i in range(hours):
            hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=hours - 1 - i)
            hour_end = hour_start + timedelta(hours=1)
            hour_records = [r for r in records if hour_start <= r.inspection_time < hour_end]
            trend_data.append({
                "time": hour_start.strftime("%H:00"),
                "total": len(hour_records),
                "pass": sum(1 for r in hour_records if r.result == "pass"),
                "fail": sum(1 for r in hour_records if r.result in ["fail", "rework"]),
            })
    else:
        days = 7 if period == "week" else 30
        for i in range(days):
            day_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1 - i)
            day_end = day_start + timedelta(days=1)
            day_records = [r for r in records if day_start <= r.inspection_time < day_end]
            trend_data.append({
                "time": day_start.strftime("%m-%d"),
                "total": len(day_records),
                "pass": sum(1 for r in day_records if r.result == "pass"),
                "fail": sum(1 for r in day_records if r.result in ["fail", "rework"]),
            })

    return {
        "total_count": total_count,
        "pass_count": pass_count,
        "rework_count": rework_count,
        "fail_count": fail_count,
        "pass_rate": round(pass_rate, 2),
        "defect_distribution": defect_distribution,
        "top_defects": top_defects,
        "trend_data": trend_data,
    }


@app.get("/api/production-lines", response_model=List[schemas.ProductionLine])
def get_production_lines(db: Session = Depends(get_db)):
    return db.query(models.ProductionLine).all()


@app.get("/api/production-lines/{line_id}", response_model=schemas.ProductionLine)
def get_production_line(line_id: int, db: Session = Depends(get_db)):
    line = db.query(models.ProductionLine).filter(models.ProductionLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="产线不存在")
    return line


@app.post("/api/production-lines/{line_id}/control")
def control_production_line(line_id: int, action: str = Query(..., description="start, stop, pause"), db: Session = Depends(get_db)):
    line = db.query(models.ProductionLine).filter(models.ProductionLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="产线不存在")

    status_map = {"start": "running", "stop": "stopped", "pause": "paused"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="无效的操作")

    line.status = status_map[action]
    line.last_heartbeat = datetime.utcnow()
    db.commit()
    db.refresh(line)

    return {"message": f"产线{action}成功", "line": line}


@app.get("/api/alerts", response_model=List[schemas.Alert])
def get_alerts(
    skip: int = 0,
    limit: int = 50,
    level: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_handled: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Alert)
    if level:
        query = query.filter(models.Alert.level == level)
    if is_read is not None:
        query = query.filter(models.Alert.is_read == is_read)
    if is_handled is not None:
        query = query.filter(models.Alert.is_handled == is_handled)
    return query.order_by(models.Alert.created_at.desc()).offset(skip).limit(limit).all()


@app.put("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    alert.is_read = True
    db.commit()
    return {"message": "标记已读成功"}


@app.put("/api/alerts/{alert_id}/handle")
def handle_alert(alert_id: int, handled_by: Optional[str] = None, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    alert.is_handled = True
    alert.handled_by = handled_by
    alert.handled_at = datetime.utcnow()
    db.commit()
    return {"message": "处理告警成功"}


@app.get("/api/system-configs", response_model=List[schemas.SystemConfig])
def get_system_configs(db: Session = Depends(get_db)):
    return db.query(models.SystemConfig).all()


@app.get("/api/system-configs/{config_key}", response_model=schemas.SystemConfig)
def get_system_config(config_key: str, db: Session = Depends(get_db)):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.config_key == config_key).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@app.put("/api/system-configs/{config_key}", response_model=schemas.SystemConfig)
def update_system_config(config_key: str, config_update: schemas.SystemConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.config_key == config_key).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    config.config_value = config_update.config_value
    if config_update.description:
        config.description = config_update.description
    db.commit()
    db.refresh(config)
    return config


@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": detection_engine.model_loaded,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/sync/upload")
async def sync_upload(records: List[dict], db: Session = Depends(get_db)):
    synced_count = 0
    for record_data in records:
        sn = record_data.get("serial_number")
        existing = db.query(models.InspectionRecord).filter(models.InspectionRecord.serial_number == sn).first()
        if existing:
            continue

        db_record = models.InspectionRecord(
            serial_number=sn,
            product_code=record_data.get("product_code"),
            line_number=record_data.get("line_number"),
            result=record_data.get("result"),
            severity_level=record_data.get("severity_level", 0),
            defect_count=record_data.get("defect_count", 0),
            processing_time=record_data.get("processing_time", 0),
            is_synced=True,
        )
        db.add(db_record)
        synced_count += 1

    db.commit()

    sync_log = models.SyncLog(
        sync_type="data",
        direction="upload",
        record_count=synced_count,
        status="completed",
        completed_at=datetime.utcnow(),
    )
    db.add(sync_log)
    db.commit()

    return {"synced_count": synced_count, "message": "同步成功"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
