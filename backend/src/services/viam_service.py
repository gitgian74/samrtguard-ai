"""
VIAM Service for video streaming and robot control
Handles connection to VIAM robot and camera streaming
"""

import asyncio
import base64
import io
import logging
from typing import Optional, Dict, Any, List
from PIL import Image
import json

from viam.robot.client import RobotClient
from viam.components.camera import Camera
from viam.components.generic import Generic as GenericComponent
from viam.services.mlmodel import MLModelClient
from viam.services.vision import VisionClient

logger = logging.getLogger(__name__)

class ViamService:
    """Service for managing VIAM robot connection and camera streaming"""
    
    def __init__(self, api_key: str, api_key_id: str, robot_address: str):
        self.api_key = api_key
        self.api_key_id = api_key_id
        self.robot_address = robot_address
        self.robot_client: Optional[RobotClient] = None
        self.cameras: Dict[str, Camera] = {}
        self.vision_services: Dict[str, VisionClient] = {}
        self.ml_services: Dict[str, MLModelClient] = {}
        self.connected = False
        
    async def connect(self) -> bool:
        """Connect to VIAM robot"""
        try:
            opts = RobotClient.Options.with_api_key(
                api_key=self.api_key,
                api_key_id=self.api_key_id
            )
            self.robot_client = await RobotClient.at_address(self.robot_address, opts)
            
            # Initialize cameras
            await self._initialize_cameras()
            
            # Initialize services
            await self._initialize_services()
            
            self.connected = True
            logger.info(f"Connected to VIAM robot at {self.robot_address}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to VIAM robot: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from VIAM robot"""
        if self.robot_client:
            await self.robot_client.close()
            self.robot_client = None
            self.cameras.clear()
            self.vision_services.clear()
            self.ml_services.clear()
            self.connected = False
            logger.info("Disconnected from VIAM robot")
    
    async def _initialize_cameras(self):
        """Initialize camera components"""
        if not self.robot_client:
            return
            
        try:
            resource_names = self.robot_client.resource_names
            camera_names = [name.name for name in resource_names if name.api.resource_type == "camera"]
            
            for camera_name in camera_names:
                try:
                    camera = Camera.from_robot(self.robot_client, camera_name)
                    self.cameras[camera_name] = camera
                    logger.info(f"Initialized camera: {camera_name}")
                except Exception as e:
                    logger.error(f"Failed to initialize camera {camera_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize cameras: {e}")
    
    async def _initialize_services(self):
        """Initialize ML and vision services"""
        if not self.robot_client:
            return
            
        try:
            resource_names = self.robot_client.resource_names
            
            # Initialize vision services
            vision_names = [name.name for name in resource_names if name.api.resource_type == "vision"]
            for vision_name in vision_names:
                try:
                    vision_service = VisionClient.from_robot(self.robot_client, vision_name)
                    self.vision_services[vision_name] = vision_service
                    logger.info(f"Initialized vision service: {vision_name}")
                except Exception as e:
                    logger.error(f"Failed to initialize vision service {vision_name}: {e}")
            
            # Initialize ML model services
            ml_names = [name.name for name in resource_names if name.api.resource_type == "mlmodel"]
            for ml_name in ml_names:
                try:
                    ml_service = MLModelClient.from_robot(self.robot_client, ml_name)
                    self.ml_services[ml_name] = ml_service
                    logger.info(f"Initialized ML service: {ml_name}")
                except Exception as e:
                    logger.error(f"Failed to initialize ML service {ml_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize services: {e}")
    
    async def get_camera_image(self, camera_name: str) -> Optional[str]:
        """Get image from camera as base64 encoded string"""
        if not self.connected or camera_name not in self.cameras:
            return None
            
        try:
            camera = self.cameras[camera_name]
            image = await camera.get_image()
            
            # Convert PIL Image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/jpeg;base64,{img_str}"
            
        except Exception as e:
            logger.error(f"Failed to get image from camera {camera_name}: {e}")
            return None
    
    async def get_camera_stream_url(self, camera_name: str) -> Optional[str]:
        """Get streaming URL for camera (if supported)"""
        # For RTSP cameras, we can return the RTSP URL directly
        # This would need to be configured based on the camera setup
        if camera_name == "camera-1":
            return "rtsp://admin:123456@192.168.1.188:554/stream"
        elif camera_name == "camera-2":
            return "rtsp://admin:Yaba@daba101@192.168.1.108:554"
        return None
    
    async def get_detection_results(self, camera_name: str, vision_service_name: str = "vision-effdet") -> Optional[List[Dict]]:
        """Get object detection results from vision service"""
        if not self.connected or camera_name not in self.cameras or vision_service_name not in self.vision_services:
            return None
            
        try:
            camera = self.cameras[camera_name]
            vision_service = self.vision_services[vision_service_name]
            
            # Get image from camera
            image = await camera.get_image()
            
            # Run detection
            detections = await vision_service.get_detections(image)
            
            # Convert to serializable format
            results = []
            for detection in detections:
                results.append({
                    'class_name': detection.class_name,
                    'confidence': detection.confidence,
                    'x_min': detection.x_min,
                    'y_min': detection.y_min,
                    'x_max': detection.x_max,
                    'y_max': detection.y_max
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get detection results: {e}")
            return None
    
    async def get_camera_list(self) -> List[Dict[str, Any]]:
        """Get list of available cameras with their status"""
        cameras_info = []
        
        for camera_name, camera in self.cameras.items():
            try:
                # Try to get an image to check if camera is working
                image = await camera.get_image()
                status = "active" if image else "inactive"
                
                # Get stream URL if available
                stream_url = await self.get_camera_stream_url(camera_name)
                
                cameras_info.append({
                    'name': camera_name,
                    'status': status,
                    'stream_url': stream_url,
                    'type': 'rtsp' if stream_url else 'image',
                    'resolution': '1920x1080',  # Default, could be detected
                    'fps': 30  # Default, could be detected
                })
                
            except Exception as e:
                logger.error(f"Error checking camera {camera_name}: {e}")
                cameras_info.append({
                    'name': camera_name,
                    'status': 'error',
                    'stream_url': None,
                    'type': 'unknown',
                    'error': str(e)
                })
        
        return cameras_info
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to VIAM robot"""
        try:
            if not self.connected:
                success = await self.connect()
                if not success:
                    return {'success': False, 'error': 'Failed to connect'}
            
            # Test by getting resource names
            resource_names = self.robot_client.resource_names
            
            return {
                'success': True,
                'connected': True,
                'resources': len(resource_names),
                'cameras': len(self.cameras),
                'vision_services': len(self.vision_services),
                'ml_services': len(self.ml_services)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Global VIAM service instance
viam_service: Optional[ViamService] = None

def get_viam_service() -> Optional[ViamService]:
    """Get the global VIAM service instance"""
    return viam_service

def initialize_viam_service(api_key: str, api_key_id: str, robot_address: str) -> ViamService:
    """Initialize the global VIAM service instance"""
    global viam_service
    viam_service = ViamService(api_key, api_key_id, robot_address)
    return viam_service

