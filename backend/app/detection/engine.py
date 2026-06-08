import cv2
import numpy as np
import random
import time
from typing import List, Dict, Tuple
from datetime import datetime
import os


class DefectDetectionEngine:
    def __init__(self):
        self.model_loaded = False
        self.defect_types = [
            {"code": "scratch", "name": "划痕", "category": "surface", "severity_level": 2, "probability": 0.15},
            {"code": "dent", "name": "凹坑", "category": "surface", "severity_level": 2, "probability": 0.1},
            {"code": "stain", "name": "污渍", "category": "surface", "severity_level": 1, "probability": 0.2},
            {"code": "discoloration", "name": "色差", "category": "appearance", "severity_level": 2, "probability": 0.08},
            {"code": "lack_material", "name": "缺料", "category": "structure", "severity_level": 3, "probability": 0.05},
            {"code": "deformation", "name": "变形", "category": "structure", "severity_level": 3, "probability": 0.05},
            {"code": "burr", "name": "毛刺", "category": "edge", "severity_level": 1, "probability": 0.12},
            {"code": "crack", "name": "裂纹", "category": "structure", "severity_level": 3, "probability": 0.03},
            {"code": "bubble", "name": "气泡", "category": "surface", "severity_level": 1, "probability": 0.08},
            {"code": "foreign_matter", "name": "异物", "category": "surface", "severity_level": 2, "probability": 0.1},
        ]
        self._load_model()

    def _load_model(self):
        time.sleep(0.5)
        self.model_loaded = True

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        denoised = cv2.fastNlMeansDenoisingColored(image, None, 3, 3, 7, 21)

        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        normalized = cv2.merge([l, a, b])
        normalized = cv2.cvtColor(normalized, cv2.COLOR_LAB2BGR)

        return normalized

    def detect(self, image: np.ndarray, product_code: str = "default") -> Dict:
        start_time = time.time()

        if not self.model_loaded:
            raise RuntimeError("Model not loaded")

        preprocessed = self.preprocess_image(image)

        height, width = preprocessed.shape[:2]

        has_defect = random.random() < 0.35
        defects = []

        if has_defect:
            num_defects = random.randint(1, 5)
            for i in range(num_defects):
                defect_type = random.choices(
                    self.defect_types,
                    weights=[d["probability"] for d in self.defect_types],
                    k=1
                )[0]

                defect_width = random.randint(int(width * 0.02), int(width * 0.15))
                defect_height = random.randint(int(height * 0.02), int(height * 0.15))
                x1 = random.randint(0, width - defect_width)
                y1 = random.randint(0, height - defect_height)
                x2 = x1 + defect_width
                y2 = y1 + defect_height

                confidence = round(random.uniform(0.6, 0.99), 3)

                defect = {
                    "defect_type_code": defect_type["code"],
                    "defect_type_name": defect_type["name"],
                    "severity_level": defect_type["severity_level"],
                    "confidence": confidence,
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2),
                    "center_x": float((x1 + x2) / 2),
                    "center_y": float((y1 + y2) / 2),
                    "width": float(defect_width),
                    "height": float(defect_height),
                    "area": float(defect_width * defect_height),
                    "description": f"{defect_type['name']}缺陷，置信度{confidence*100:.1f}%"
                }
                defects.append(defect)

        processing_time = round(time.time() - start_time, 4)

        if len(defects) == 0:
            result = "pass"
            severity_level = 0
        else:
            max_severity = max(d["severity_level"] for d in defects)
            severity_level = max_severity
            if max_severity >= 3:
                result = "fail"
            elif max_severity == 2 and len(defects) >= 3:
                result = "fail"
            else:
                result = "rework"

        return {
            "result": result,
            "severity_level": severity_level,
            "defect_count": len(defects),
            "defects": defects,
            "processing_time": processing_time,
            "image_width": width,
            "image_height": height,
            "preprocessed": preprocessed
        }

    def detect_from_file(self, image_path: str, product_code: str = "default") -> Dict:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Cannot read image from {image_path}")
        return self.detect(image, product_code)

    def get_defect_types(self) -> List[Dict]:
        return self.defect_types

    def visualize_defects(self, image: np.ndarray, defects: List[Dict]) -> np.ndarray:
        vis_image = image.copy()

        severity_colors = {
            1: (0, 255, 255),
            2: (0, 165, 255),
            3: (0, 0, 255),
        }

        for defect in defects:
            color = severity_colors.get(defect["severity_level"], (255, 0, 0))
            x1, y1 = int(defect["x1"]), int(defect["y1"])
            x2, y2 = int(defect["x2"]), int(defect["y2"])

            cv2.rectangle(vis_image, (x1, y1), (x2, y2), color, 2)

            label = f"{defect['defect_type_name']} {defect['confidence']*100:.0f}%"
            (label_w, label_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)

            cv2.rectangle(vis_image, (x1, y1 - label_h - baseline - 4),
                         (x1 + label_w, y1), color, -1)
            cv2.putText(vis_image, label, (x1, y1 - baseline - 2),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return vis_image


detection_engine = DefectDetectionEngine()
