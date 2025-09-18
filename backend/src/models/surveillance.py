"""
Database models for surveillance platform
Local SQLite models for caching and offline functionality
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from typing import Dict, Any

db = SQLAlchemy()

class Tower(db.Model):
    """Tower model for local caching"""
    __tablename__ = 'towers'
    
    id = db.Column(db.String(50), primary_key=True)
    area_id = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(500))
    ip_address = db.Column(db.String(45), nullable=False)
    status = db.Column(db.String(20), default='offline')
    last_heartbeat = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cameras = db.relationship('Camera', backref='tower', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'area_id': self.area_id,
            'name': self.name,
            'location': self.location,
            'ip_address': self.ip_address,
            'status': self.status,
            'last_heartbeat': self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'cameras_count': len(self.cameras)
        }

class Camera(db.Model):
    """Camera model for local caching"""
    __tablename__ = 'cameras'
    
    id = db.Column(db.String(50), primary_key=True)
    tower_id = db.Column(db.String(50), db.ForeignKey('towers.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    rtsp_url = db.Column(db.String(500), nullable=False)
    resolution = db.Column(db.String(20), default='1920x1080')
    fps = db.Column(db.Integer, default=30)
    status = db.Column(db.String(20), default='inactive')
    last_seen = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    alarms = db.relationship('Alarm', backref='camera', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'tower_id': self.tower_id,
            'name': self.name,
            'rtsp_url': self.rtsp_url,
            'resolution': self.resolution,
            'fps': self.fps,
            'status': self.status,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'tower_name': self.tower.name if self.tower else None
        }

class Alarm(db.Model):
    """Alarm model for local caching"""
    __tablename__ = 'alarms'
    
    id = db.Column(db.String(50), primary_key=True)
    camera_id = db.Column(db.String(50), db.ForeignKey('cameras.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    image_url = db.Column(db.String(500))
    video_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='new')
    acknowledged_by = db.Column(db.String(50))
    acknowledged_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'type': self.type,
            'confidence': self.confidence,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'image_url': self.image_url,
            'video_url': self.video_url,
            'status': self.status,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'camera_name': self.camera.name if self.camera else None,
            'tower_name': self.camera.tower.name if self.camera and self.camera.tower else None
        }

class SystemAlert(db.Model):
    """System alert model for local caching"""
    __tablename__ = 'system_alerts'
    
    id = db.Column(db.String(50), primary_key=True)
    tower_id = db.Column(db.String(50), db.ForeignKey('towers.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(1000), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'tower_id': self.tower_id,
            'type': self.type,
            'message': self.message,
            'severity': self.severity,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'tower_name': self.tower.name if self.tower else None
        }
