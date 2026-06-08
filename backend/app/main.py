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

    def broadcast_sync(self, message: dict):
        import asyncio
        for connection in self.active_connections:
            try:
                asyncio.create_task(connection.send_json(message))
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

        defect_type_codes = set(d["defect_type_code"] for d in result["defects"])
        for defect_code in defect_type_codes:
            check_batch_alerts(db, line_number, defect_code, serial_number)

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
    return query.order_by(models.InspectionRecord.inspection_time.desc()).offset(skip).limit(limit).all()


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
    db: Session = Depends(get_db)
):
    now = datetime.now()
    if period == "day":
        start_time = now - timedelta(days=1)
    elif period == "week":
        start_time = now - timedelta(days=7)
    elif period == "month":
        start_time = now - timedelta(days=30)
    else:
        start_time = now - timedelta(days=1)

    query = db.query(models.InspectionRecord).filter(models.InspectionRecord.inspection_time >= start_time)
    if product_code:
        query = query.filter(models.InspectionRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.InspectionRecord.line_number == line_number)

    records = query.all()

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


# ==================== 多维度缺陷分析报表模块 ====================

@app.get("/api/reports/multi-dimension")
def get_multi_dimension_report(
    dimension: str = Query("line_number", description="维度: line_number, shift, workstation, product_code, defect_type, severity_level"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.InspectionRecord)

    if start_time:
        query = query.filter(models.InspectionRecord.inspection_time >= start_time)
    if end_time:
        query = query.filter(models.InspectionRecord.inspection_time <= end_time)
    if product_code:
        query = query.filter(models.InspectionRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.InspectionRecord.line_number == line_number)

    records = query.all()

    dimension_map = {
        "line_number": ("line_number", "产线"),
        "shift": ("shift", "班次"),
        "workstation": ("workstation", "工位"),
        "product_code": ("product_code", "产品型号"),
        "defect_type": ("defect_type_code", "缺陷类型"),
        "severity_level": ("severity_level", "缺陷等级"),
    }

    dim_key, dim_name = dimension_map.get(dimension, ("line_number", "产线"))

    results = {}

    if dimension == "defect_type":
        for record in records:
            for defect in record.defects:
                key = defect.defect_type_code or "unknown"
                if key not in results:
                    results[key] = {
                        "dimension": dim_name,
                        "dimension_value": defect.defect_type_name or key,
                        "dimension_key": key,
                        "total_count": 0,
                        "pass_count": 0,
                        "rework_count": 0,
                        "fail_count": 0,
                        "defect_count": 0,
                    }
                results[key]["defect_count"] += 1
                results[key]["total_count"] += 1
                if record.result == "pass":
                    results[key]["pass_count"] += 1
                elif record.result == "rework":
                    results[key]["rework_count"] += 1
                elif record.result == "fail":
                    results[key]["fail_count"] += 1
    elif dimension == "severity_level":
        for record in records:
            key = str(record.severity_level)
            level_names = {"0": "无缺陷", "1": "轻微", "2": "一般", "3": "严重"}
            if key not in results:
                results[key] = {
                    "dimension": dim_name,
                    "dimension_value": level_names.get(key, key),
                    "dimension_key": key,
                    "total_count": 0,
                    "pass_count": 0,
                    "rework_count": 0,
                    "fail_count": 0,
                    "defect_count": 0,
                }
            results[key]["total_count"] += 1
            results[key]["defect_count"] += record.defect_count
            if record.result == "pass":
                results[key]["pass_count"] += 1
            elif record.result == "rework":
                results[key]["rework_count"] += 1
            elif record.result == "fail":
                results[key]["fail_count"] += 1
    else:
        for record in records:
            key = getattr(record, dim_key, None) or "unknown"
            if key not in results:
                results[key] = {
                    "dimension": dim_name,
                    "dimension_value": key,
                    "dimension_key": key,
                    "total_count": 0,
                    "pass_count": 0,
                    "rework_count": 0,
                    "fail_count": 0,
                    "defect_count": 0,
                }
            results[key]["total_count"] += 1
            results[key]["defect_count"] += record.defect_count
            if record.result == "pass":
                results[key]["pass_count"] += 1
            elif record.result == "rework":
                results[key]["rework_count"] += 1
            elif record.result == "fail":
                results[key]["fail_count"] += 1

    report_data = []
    for key, data in results.items():
        total = data["total_count"]
        data["pass_rate"] = round((data["pass_count"] / total * 100), 2) if total > 0 else 0
        data["fail_rate"] = round((data["fail_count"] / total * 100), 2) if total > 0 else 0
        report_data.append(data)

    report_data.sort(key=lambda x: x["total_count"], reverse=True)

    return {
        "dimension": dim_name,
        "dimension_key": dimension,
        "total_records": len(records),
        "data": report_data,
    }


@app.get("/api/reports/trend")
def get_trend_report(
    period: str = Query("day", description="day, week, month"),
    metric: str = Query("defect_rate", description="pass_rate, fail_rate, defect_count, total_count"),
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    defect_type_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    now = datetime.now()

    if period == "day":
        points = 24
        delta = timedelta(hours=1)
        format_str = "%H:00"
        start_time = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
    elif period == "week":
        points = 7
        delta = timedelta(days=1)
        format_str = "%m-%d"
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=6)
    elif period == "month":
        points = 30
        delta = timedelta(days=1)
        format_str = "%m-%d"
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=29)
    else:
        points = 24
        delta = timedelta(hours=1)
        format_str = "%H:00"
        start_time = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)

    trend_data = []

    for i in range(points):
        period_start = start_time + delta * i
        period_end = period_start + delta

        query = db.query(models.InspectionRecord).filter(
            models.InspectionRecord.inspection_time >= period_start,
            models.InspectionRecord.inspection_time < period_end,
        )

        if product_code:
            query = query.filter(models.InspectionRecord.product_code == product_code)
        if line_number:
            query = query.filter(models.InspectionRecord.line_number == line_number)

        records = query.all()

        if defect_type_code:
            filtered_records = []
            for r in records:
                has_defect = any(d.defect_type_code == defect_type_code for d in r.defects)
                if has_defect:
                    filtered_records.append(r)
            records = filtered_records

        total = len(records)
        pass_count = sum(1 for r in records if r.result == "pass")
        fail_count = sum(1 for r in records if r.result == "fail")
        rework_count = sum(1 for r in records if r.result == "rework")
        defect_total = sum(r.defect_count for r in records)

        if metric == "pass_rate":
            value = round((pass_count / total * 100), 2) if total > 0 else 0
        elif metric == "fail_rate":
            value = round((fail_count / total * 100), 2) if total > 0 else 0
        elif metric == "defect_count":
            value = defect_total
        else:
            value = total

        trend_data.append({
            "time": period_start.strftime(format_str),
            "value": value,
            "total_count": total,
            "pass_count": pass_count,
            "fail_count": fail_count,
            "rework_count": rework_count,
            "defect_count": defect_total,
        })

    return {
        "period": period,
        "metric": metric,
        "data": trend_data,
    }


@app.get("/api/reports/export")
def export_report(
    report_type: str = Query("summary", description="summary, by_line, by_defect, trend"),
    format: str = Query("csv", description="csv, json"),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.InspectionRecord)
    if start_time:
        query = query.filter(models.InspectionRecord.inspection_time >= start_time)
    if end_time:
        query = query.filter(models.InspectionRecord.inspection_time <= end_time)
    if product_code:
        query = query.filter(models.InspectionRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.InspectionRecord.line_number == line_number)

    records = query.order_by(models.InspectionRecord.inspection_time.desc()).all()

    if format == "json":
        return {
            "report_type": report_type,
            "generated_at": datetime.now().isoformat(),
            "total_records": len(records),
            "records": [
                {
                    "serial_number": r.serial_number,
                    "product_code": r.product_code,
                    "line_number": r.line_number,
                    "shift": r.shift,
                    "workstation": r.workstation,
                    "result": r.result,
                    "severity_level": r.severity_level,
                    "defect_count": r.defect_count,
                    "inspection_time": r.inspection_time.isoformat(),
                    "defects": [
                        {
                            "defect_type_code": d.defect_type_code,
                            "defect_type_name": d.defect_type_name,
                            "severity_level": d.severity_level,
                            "confidence": d.confidence,
                        }
                        for d in r.defects
                    ],
                }
                for r in records
            ],
        }
    else:
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "序列号", "产品型号", "产线", "班次", "工位", "检测结果",
            "严重等级", "缺陷数量", "检测时间", "缺陷详情"
        ])

        result_map = {"pass": "合格", "rework": "返工", "fail": "报废"}

        for r in records:
            defect_details = "; ".join([
                f"{d.defect_type_name}({d.confidence*100:.0f}%)"
                for d in r.defects
            ]) if r.defects else ""
            writer.writerow([
                r.serial_number,
                r.product_code or "",
                r.line_number or "",
                r.shift or "",
                r.workstation or "",
                result_map.get(r.result, r.result),
                r.severity_level,
                r.defect_count,
                r.inspection_time.strftime("%Y-%m-%d %H:%M:%S"),
                defect_details,
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename=inspection_report_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
            }
        )


# ==================== 返工品统计 ====================

@app.get("/api/rework-records", response_model=List[schemas.ReworkRecord])
def get_rework_records(
    skip: int = 0,
    limit: int = 100,
    product_code: Optional[str] = None,
    line_number: Optional[str] = None,
    is_passed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ReworkRecord)
    if product_code:
        query = query.filter(models.ReworkRecord.product_code == product_code)
    if line_number:
        query = query.filter(models.ReworkRecord.line_number == line_number)
    if is_passed is not None:
        query = query.filter(models.ReworkRecord.is_passed == is_passed)
    return query.order_by(models.ReworkRecord.rework_time.desc()).offset(skip).limit(limit).all()


@app.post("/api/rework-records", response_model=schemas.ReworkRecord)
def create_rework_record(record: schemas.ReworkRecordCreate, db: Session = Depends(get_db)):
    db_record = models.ReworkRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.put("/api/rework-records/{record_id}/inspect", response_model=schemas.ReworkRecord)
def inspect_rework(
    record_id: int,
    inspection_data: schemas.ReworkRecordUpdate,
    db: Session = Depends(get_db)
):
    record = db.query(models.ReworkRecord).filter(models.ReworkRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="返工记录不存在")

    update_data = inspection_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    if inspection_data.rework_result == "pass":
        record.is_passed = True

    record.inspection_time = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/rework-statistics")
def get_rework_statistics(
    period: str = Query("month", description="day, week, month"),
    product_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    now = datetime.now()
    if period == "day":
        start_time = now - timedelta(days=1)
    elif period == "week":
        start_time = now - timedelta(days=7)
    elif period == "month":
        start_time = now - timedelta(days=30)
    else:
        start_time = now - timedelta(days=30)

    query = db.query(models.ReworkRecord).filter(models.ReworkRecord.rework_time >= start_time)
    if product_code:
        query = query.filter(models.ReworkRecord.product_code == product_code)

    records = query.all()

    total_count = len(records)
    pass_count = sum(1 for r in records if r.is_passed)
    fail_count = sum(1 for r in records if not r.is_passed and r.rework_result)
    pass_rate = round((pass_count / total_count * 100), 2) if total_count > 0 else 0

    defect_reductions = []
    for r in records:
        if r.original_defect_count > 0 and r.rework_defect_count is not None:
            reduction = (r.original_defect_count - r.rework_defect_count) / r.original_defect_count * 100
            defect_reductions.append(reduction)
    avg_reduction = round(sum(defect_reductions) / len(defect_reductions), 2) if defect_reductions else 0

    by_product = {}
    for r in records:
        pc = r.product_code or "unknown"
        if pc not in by_product:
            by_product[pc] = {"product_code": pc, "total": 0, "pass": 0, "fail": 0}
        by_product[pc]["total"] += 1
        if r.is_passed:
            by_product[pc]["pass"] += 1
        elif r.rework_result:
            by_product[pc]["fail"] += 1

    return {
        "total_rework_count": total_count,
        "rework_pass_count": pass_count,
        "rework_fail_count": fail_count,
        "rework_pass_rate": pass_rate,
        "avg_rework_defect_reduction": avg_reduction,
        "by_product": list(by_product.values()),
    }


# ==================== 报表定时推送 ====================

@app.get("/api/report-schedules", response_model=List[schemas.ReportSchedule])
def get_report_schedules(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.ReportSchedule).order_by(models.ReportSchedule.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/api/report-schedules", response_model=schemas.ReportSchedule)
def create_report_schedule(schedule: schemas.ReportScheduleCreate, db: Session = Depends(get_db)):
    db_schedule = models.ReportSchedule(**schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@app.put("/api/report-schedules/{schedule_id}", response_model=schemas.ReportSchedule)
def update_report_schedule(schedule_id: int, schedule_update: schemas.ReportScheduleUpdate, db: Session = Depends(get_db)):
    schedule = db.query(models.ReportSchedule).filter(models.ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="报表计划不存在")
    update_data = schedule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    return schedule


@app.delete("/api/report-schedules/{schedule_id}")
def delete_report_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.ReportSchedule).filter(models.ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="报表计划不存在")
    db.delete(schedule)
    db.commit()
    return {"message": "删除成功"}


# ==================== 模型在线调优功能 ====================

TRAINING_SAMPLES_DIR = os.path.join(STATIC_DIR, "training_samples")
os.makedirs(TRAINING_SAMPLES_DIR, exist_ok=True)


def init_model_versions(db: Session):
    existing = db.query(models.ModelVersion).count()
    if existing > 0:
        return

    model_version = models.ModelVersion(
        version_code="v1.0.0",
        version_name="初始版本",
        description="系统初始检测模型版本",
        is_active=True,
        accuracy=0.85,
        precision=0.83,
        recall=0.81,
        f1_score=0.82,
        training_samples=1000,
        created_by="system",
    )
    db.add(model_version)
    db.commit()


@app.on_event("startup")
def init_model_versions_on_startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        init_model_versions(db)
    finally:
        db.close()


@app.get("/api/model-versions", response_model=List[schemas.ModelVersion])
def get_model_versions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.ModelVersion).order_by(models.ModelVersion.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/model-versions/active", response_model=schemas.ModelVersion)
def get_active_model_version(db: Session = Depends(get_db)):
    model = db.query(models.ModelVersion).filter(models.ModelVersion.is_active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="没有激活的模型版本")
    return model


@app.post("/api/model-versions/{version_id}/activate", response_model=schemas.ModelVersion)
def activate_model_version(version_id: int, db: Session = Depends(get_db)):
    target_model = db.query(models.ModelVersion).filter(models.ModelVersion.id == version_id).first()
    if not target_model:
        raise HTTPException(status_code=404, detail="模型版本不存在")

    db.query(models.ModelVersion).filter(models.ModelVersion.is_active == True).update({"is_active": False})

    target_model.is_active = True
    db.commit()
    db.refresh(target_model)

    manager.broadcast_sync({
        "type": "model_changed",
        "data": {
            "version_code": target_model.version_code,
            "version_name": target_model.version_name,
        }
    })

    return target_model


@app.post("/api/model-versions/{version_id}/rollback", response_model=schemas.ModelVersion)
def rollback_model_version(version_id: int, db: Session = Depends(get_db)):
    target_model = db.query(models.ModelVersion).filter(models.ModelVersion.id == version_id).first()
    if not target_model:
        raise HTTPException(status_code=404, detail="模型版本不存在")

    active_model = db.query(models.ModelVersion).filter(models.ModelVersion.is_active == True).first()
    if active_model:
        active_model.is_active = False
        active_model.rolled_back_at = datetime.utcnow()

    target_model.is_active = True
    db.commit()
    db.refresh(target_model)

    return target_model


@app.get("/api/training-samples", response_model=List[schemas.TrainingSample])
def get_training_samples(
    skip: int = 0,
    limit: int = 100,
    sample_type: Optional[str] = None,
    defect_type_code: Optional[str] = None,
    is_annotated: Optional[bool] = None,
    is_used: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.TrainingSample)
    if sample_type:
        query = query.filter(models.TrainingSample.sample_type == sample_type)
    if defect_type_code:
        query = query.filter(models.TrainingSample.defect_type_code == defect_type_code)
    if is_annotated is not None:
        query = query.filter(models.TrainingSample.is_annotated == is_annotated)
    if is_used is not None:
        query = query.filter(models.TrainingSample.is_used == is_used)
    return query.order_by(models.TrainingSample.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/api/training-samples/upload")
async def upload_training_sample(
    file: UploadFile = File(...),
    sample_type: str = Query("defect"),
    defect_type_code: Optional[str] = None,
    defect_type_name: Optional[str] = None,
    product_code: Optional[str] = None,
    uploaded_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    import cv2
    import numpy as np

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="无效的图片文件")

    filename = f"{sample_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}.jpg"
    filepath = os.path.join(TRAINING_SAMPLES_DIR, filename)
    cv2.imwrite(filepath, image)

    relative_path = f"/static/training_samples/{filename}"

    db_sample = models.TrainingSample(
        sample_type=sample_type,
        image_path=relative_path,
        defect_type_code=defect_type_code,
        defect_type_name=defect_type_name,
        product_code=product_code,
        is_annotated=sample_type == "normal",
        source="manual",
        uploaded_by=uploaded_by,
    )
    db.add(db_sample)
    db.commit()
    db.refresh(db_sample)

    return db_sample


@app.put("/api/training-samples/{sample_id}/annotate", response_model=schemas.TrainingSample)
def annotate_training_sample(
    sample_id: int,
    annotation_data: schemas.TrainingSampleUpdate,
    db: Session = Depends(get_db)
):
    sample = db.query(models.TrainingSample).filter(models.TrainingSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="训练样本不存在")

    update_data = annotation_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sample, key, value)
    sample.is_annotated = True
    db.commit()
    db.refresh(sample)
    return sample


@app.delete("/api/training-samples/{sample_id}")
def delete_training_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = db.query(models.TrainingSample).filter(models.TrainingSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="训练样本不存在")

    if sample.image_path and sample.image_path.startswith("/static/"):
        full_path = os.path.join(STATIC_DIR, sample.image_path.replace("/static/", ""))
        if os.path.exists(full_path):
            os.remove(full_path)

    db.delete(sample)
    db.commit()
    return {"message": "删除成功"}


@app.get("/api/training-tasks", response_model=List[schemas.TrainingTask])
def get_training_tasks(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.TrainingTask)
    if status:
        query = query.filter(models.TrainingTask.status == status)
    return query.order_by(models.TrainingTask.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/api/training-tasks", response_model=schemas.TrainingTask)
def create_training_task(
    task_data: schemas.TrainingTaskCreate,
    db: Session = Depends(get_db)
):
    sample_count = 0
    if task_data.sample_ids:
        sample_count = len(task_data.sample_ids)
    else:
        sample_count = db.query(models.TrainingSample).filter(
            models.TrainingSample.is_annotated == True,
            models.TrainingSample.is_used == False,
        ).count()

    db_task = models.TrainingTask(
        task_name=task_data.task_name,
        description=task_data.description,
        status="pending",
        sample_count=sample_count,
        epochs=task_data.epochs,
        learning_rate=task_data.learning_rate,
        batch_size=task_data.batch_size,
        created_by=task_data.created_by,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    import threading
    def simulate_training():
        import time
        with SessionLocal() as db_session:
            task = db_session.query(models.TrainingTask).filter(models.TrainingTask.id == db_task.id).first()
            if not task:
                return

            task.status = "training"
            task.started_at = datetime.utcnow()
            db_session.commit()

            total_epochs = task.epochs
            for epoch in range(total_epochs):
                time.sleep(0.5)
                progress = int((epoch + 1) / total_epochs * 100)
                loss = round(1.0 - (epoch + 1) / total_epochs * 0.7, 4)
                accuracy = round(0.7 + (epoch + 1) / total_epochs * 0.2, 4)

                task.progress = progress
                task.loss = loss
                task.accuracy = accuracy
                db_session.commit()

                manager.broadcast_sync({
                    "type": "training_progress",
                    "data": {
                        "task_id": task.id,
                        "progress": progress,
                        "loss": loss,
                        "accuracy": accuracy,
                    }
                })

            version_code = f"v1.{len(db_session.query(models.ModelVersion).all())}.0"
            new_model = models.ModelVersion(
                version_code=version_code,
                version_name=task.task_name,
                description=f"由训练任务 {task.id} 生成",
                is_active=False,
                accuracy=task.accuracy,
                precision=round(task.accuracy * 0.98, 4),
                recall=round(task.accuracy * 0.95, 4),
                f1_score=round(task.accuracy * 0.96, 4),
                training_samples=task.sample_count,
                training_time=task.epochs * 0.5,
                created_by=task.created_by or "system",
            )
            db_session.add(new_model)
            db_session.flush()

            task.status = "completed"
            task.model_version_id = new_model.id
            task.model_version_code = version_code
            task.completed_at = datetime.utcnow()
            db_session.commit()

            db_session.query(models.TrainingSample).filter(
                models.TrainingSample.is_annotated == True,
                models.TrainingSample.is_used == False,
            ).update({"is_used": True})
            db_session.commit()

            manager.broadcast_sync({
                "type": "training_completed",
                "data": {
                    "task_id": task.id,
                    "model_version_code": version_code,
                    "accuracy": task.accuracy,
                }
            })

    thread = threading.Thread(target=simulate_training, daemon=True)
    thread.start()

    return db_task


@app.get("/api/training-tasks/{task_id}", response_model=schemas.TrainingTask)
def get_training_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.TrainingTask).filter(models.TrainingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    return task


# ==================== 批量异常预警机制 ====================

def init_batch_alert_configs(db: Session):
    existing = db.query(models.BatchAlertConfig).count()
    if existing > 0:
        return

    configs = [
        {
            "config_name": "全线划痕预警",
            "defect_type_code": "scratch",
            "threshold_count": 5,
            "time_window_minutes": 10,
            "severity_level": 2,
            "alert_level": "critical",
            "sound_alert": True,
            "light_alert": True,
        },
        {
            "config_name": "全线色差预警",
            "defect_type_code": "discoloration",
            "threshold_count": 3,
            "time_window_minutes": 5,
            "severity_level": 2,
            "alert_level": "warning",
            "sound_alert": True,
            "light_alert": False,
        },
    ]

    for cfg in configs:
        db_cfg = models.BatchAlertConfig(**cfg)
        db.add(db_cfg)

    db.commit()


@app.on_event("startup")
def init_batch_alerts_on_startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        init_batch_alert_configs(db)
    finally:
        db.close()


def check_batch_alerts(db: Session, line_number: Optional[str], defect_type_code: str, serial_number: str):
    configs = db.query(models.BatchAlertConfig).filter(
        models.BatchAlertConfig.is_enabled == True,
        (models.BatchAlertConfig.defect_type_code == defect_type_code) | (models.BatchAlertConfig.defect_type_code == None),
    ).all()

    for config in configs:
        if config.line_number and line_number and config.line_number != line_number:
            continue

        time_window = timedelta(minutes=config.time_window_minutes)
        start_time = datetime.utcnow() - time_window

        recent_defects = db.query(models.Defect).join(
            models.InspectionRecord,
            models.Defect.inspection_record_id == models.InspectionRecord.id
        ).filter(
            models.Defect.defect_type_code == defect_type_code,
            models.InspectionRecord.inspection_time >= start_time,
        )

        if config.line_number:
            recent_defects = recent_defects.filter(
                models.InspectionRecord.line_number == config.line_number
            )

        defect_count = recent_defects.count()

        if defect_count >= config.threshold_count:
            existing_alert = db.query(models.BatchAlertRecord).filter(
                models.BatchAlertRecord.config_id == config.id,
                models.BatchAlertRecord.status == "active",
                models.BatchAlertRecord.defect_type_code == defect_type_code,
            ).first()

            recent_records = recent_defects.order_by(
                models.InspectionRecord.inspection_time.desc()
            ).limit(config.threshold_count).all()

            affected_serials = list(set([
                d.inspection_record.serial_number
                for d in recent_records
                if d.inspection_record
            ]))

            if existing_alert:
                existing_alert.defect_count = defect_count
                existing_alert.last_seen_at = datetime.utcnow()
                existing_alert.affected_serials = affected_serials
                db.commit()
            else:
                alert_code = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
                defect_type = db.query(models.DefectType).filter(
                    models.DefectType.code == defect_type_code
                ).first()

                new_alert = models.BatchAlertRecord(
                    config_id=config.id,
                    alert_code=alert_code,
                    line_number=line_number,
                    defect_type_code=defect_type_code,
                    defect_type_name=defect_type.name if defect_type else defect_type_code,
                    defect_count=defect_count,
                    time_window_minutes=config.time_window_minutes,
                    threshold_count=config.threshold_count,
                    alert_level=config.alert_level,
                    status="active",
                    affected_serials=affected_serials,
                )
                db.add(new_alert)
                db.commit()
                db.refresh(new_alert)

                db_alert = models.Alert(
                    alert_type="batch",
                    level=config.alert_level,
                    title=f"批量异常预警: {new_alert.defect_type_name}",
                    content=f"{config.time_window_minutes}分钟内检测到{defect_count}件{new_alert.defect_type_name}缺陷，超过阈值{config.threshold_count}件，请立即排查！",
                    line_number=line_number,
                )
                db.add(db_alert)
                db.commit()

                import asyncio
                asyncio.create_task(manager.broadcast({
                    "type": "batch_alert",
                    "data": {
                        "id": new_alert.id,
                        "alert_code": alert_code,
                        "defect_type_code": defect_type_code,
                        "defect_type_name": new_alert.defect_type_name,
                        "defect_count": defect_count,
                        "threshold_count": config.threshold_count,
                        "time_window_minutes": config.time_window_minutes,
                        "alert_level": config.alert_level,
                        "line_number": line_number,
                        "sound_alert": config.sound_alert,
                        "light_alert": config.light_alert,
                    }
                }))


@app.get("/api/batch-alert-configs", response_model=List[schemas.BatchAlertConfig])
def get_batch_alert_configs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.BatchAlertConfig).order_by(models.BatchAlertConfig.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/api/batch-alert-configs", response_model=schemas.BatchAlertConfig)
def create_batch_alert_config(config: schemas.BatchAlertConfigCreate, db: Session = Depends(get_db)):
    db_config = models.BatchAlertConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@app.put("/api/batch-alert-configs/{config_id}", response_model=schemas.BatchAlertConfig)
def update_batch_alert_config(
    config_id: int,
    config_update: schemas.BatchAlertConfigUpdate,
    db: Session = Depends(get_db)
):
    config = db.query(models.BatchAlertConfig).filter(models.BatchAlertConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="预警配置不存在")
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


@app.delete("/api/batch-alert-configs/{config_id}")
def delete_batch_alert_config(config_id: int, db: Session = Depends(get_db)):
    config = db.query(models.BatchAlertConfig).filter(models.BatchAlertConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="预警配置不存在")
    db.delete(config)
    db.commit()
    return {"message": "删除成功"}


@app.get("/api/batch-alert-records", response_model=List[schemas.BatchAlertRecord])
def get_batch_alert_records(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    alert_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.BatchAlertRecord)
    if status:
        query = query.filter(models.BatchAlertRecord.status == status)
    if alert_level:
        query = query.filter(models.BatchAlertRecord.alert_level == alert_level)
    return query.order_by(models.BatchAlertRecord.created_at.desc()).offset(skip).limit(limit).all()


@app.put("/api/batch-alert-records/{alert_id}/resolve", response_model=schemas.BatchAlertRecord)
def resolve_batch_alert(
    alert_id: int,
    resolved_by: Optional[str] = None,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    alert = db.query(models.BatchAlertRecord).filter(models.BatchAlertRecord.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="批量预警不存在")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = resolved_by
    alert.resolution_notes = resolution_notes
    db.commit()
    db.refresh(alert)
    return alert


# ==================== 配套优化：数据归档配置 ====================

def init_archive_configs(db: Session):
    existing = db.query(models.DataArchiveConfig).count()
    if existing > 0:
        return

    configs = [
        {"config_name": "检测记录归档", "data_type": "inspection", "retention_days": 365, "archive_after_days": 90},
        {"config_name": "缺陷图片归档", "data_type": "images", "retention_days": 180, "archive_after_days": 30},
        {"config_name": "告警记录归档", "data_type": "alerts", "retention_days": 365, "archive_after_days": 180},
    ]

    for cfg in configs:
        db_cfg = models.DataArchiveConfig(**cfg)
        db.add(db_cfg)

    db.commit()


@app.on_event("startup")
def init_archive_on_startup():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        init_archive_configs(db)
    finally:
        db.close()


@app.get("/api/archive-configs", response_model=List[schemas.DataArchiveConfig])
def get_archive_configs(db: Session = Depends(get_db)):
    return db.query(models.DataArchiveConfig).all()


@app.put("/api/archive-configs/{config_id}", response_model=schemas.DataArchiveConfig)
def update_archive_config(
    config_id: int,
    config_update: schemas.DataArchiveConfigUpdate,
    db: Session = Depends(get_db)
):
    config = db.query(models.DataArchiveConfig).filter(models.DataArchiveConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="归档配置不存在")
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


# ==================== 配套优化：离线同步队列 ====================

@app.get("/api/offline-sync-queue", response_model=List[schemas.OfflineSyncQueue])
def get_offline_sync_queue(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    data_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.OfflineSyncQueue)
    if status:
        query = query.filter(models.OfflineSyncQueue.status == status)
    if data_type:
        query = query.filter(models.OfflineSyncQueue.data_type == data_type)
    return query.order_by(models.OfflineSyncQueue.priority.desc(), models.OfflineSyncQueue.created_at.asc()).offset(skip).limit(limit).all()


@app.post("/api/offline-sync-queue/batch", response_model=dict)
def batch_add_offline_queue(items: List[schemas.OfflineSyncQueueCreate], db: Session = Depends(get_db)):
    count = 0
    for item in items:
        db_item = models.OfflineSyncQueue(**item.model_dump())
        db.add(db_item)
        count += 1
    db.commit()
    return {"added_count": count}


@app.post("/api/offline-sync-queue/process", response_model=dict)
def process_offline_queue(db: Session = Depends(get_db)):
    pending_items = db.query(models.OfflineSyncQueue).filter(
        models.OfflineSyncQueue.status == "pending"
    ).order_by(
        models.OfflineSyncQueue.priority.desc(),
        models.OfflineSyncQueue.created_at.asc()
    ).limit(100).all()

    success_count = 0
    fail_count = 0

    for item in pending_items:
        try:
            if item.data_type == "inspection":
                payload = item.data_payload
                sn = payload.get("serial_number")
                existing = db.query(models.InspectionRecord).filter(
                    models.InspectionRecord.serial_number == sn
                ).first()
                if not existing:
                    db_record = models.InspectionRecord(
                        serial_number=sn,
                        product_code=payload.get("product_code"),
                        line_number=payload.get("line_number"),
                        result=payload.get("result"),
                        severity_level=payload.get("severity_level", 0),
                        defect_count=payload.get("defect_count", 0),
                        processing_time=payload.get("processing_time", 0),
                        is_synced=True,
                    )
                    db.add(db_record)

            item.status = "synced"
            item.synced_at = datetime.utcnow()
            success_count += 1
        except Exception as e:
            item.status = "failed"
            item.retry_count += 1
            item.error_message = str(e)
            fail_count += 1

    db.commit()

    return {
        "processed": len(pending_items),
        "success": success_count,
        "failed": fail_count,
    }


# ==================== 配套优化：MES系统对接 ====================

@app.get("/api/mes-configs", response_model=List[schemas.MESConfig])
def get_mes_configs(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(models.MESConfig).order_by(models.MESConfig.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/api/mes-configs", response_model=schemas.MESConfig)
def create_mes_config(config: schemas.MESConfigCreate, db: Session = Depends(get_db)):
    db_config = models.MESConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@app.put("/api/mes-configs/{config_id}", response_model=schemas.MESConfig)
def update_mes_config(
    config_id: int,
    config_update: schemas.MESConfigUpdate,
    db: Session = Depends(get_db)
):
    config = db.query(models.MESConfig).filter(models.MESConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="MES配置不存在")
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


@app.delete("/api/mes-configs/{config_id}")
def delete_mes_config(config_id: int, db: Session = Depends(get_db)):
    config = db.query(models.MESConfig).filter(models.MESConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="MES配置不存在")
    db.delete(config)
    db.commit()
    return {"message": "删除成功"}


@app.post("/api/mes/sync", response_model=dict)
def sync_with_mes(direction: str = Query("both", description="push, pull, both"), db: Session = Depends(get_db)):
    mes_config = db.query(models.MESConfig).filter(models.MESConfig.is_enabled == True).first()
    if not mes_config:
        raise HTTPException(status_code=400, detail="没有启用的MES配置")

    pushed_count = 0
    pulled_count = 0

    if direction in ["push", "both"]:
        unsynced = db.query(models.InspectionRecord).filter(
            models.InspectionRecord.is_synced == False
        ).limit(100).all()
        for record in unsynced:
            record.is_synced = True
            pushed_count += 1
        db.commit()

    if direction in ["pull", "both"]:
        pulled_count = 0

    mes_config.last_sync_at = datetime.utcnow()
    mes_config.last_sync_status = "success"
    db.commit()

    return {
        "status": "success",
        "direction": direction,
        "pushed_count": pushed_count,
        "pulled_count": pulled_count,
        "message": "MES同步完成",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
