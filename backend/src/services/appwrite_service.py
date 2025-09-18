"""
Appwrite service for backend integration
Handles all communication with Appwrite cloud database
"""

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.exception import AppwriteException
import logging
from typing import Dict, List, Optional, Any

class AppwriteService:
    """Service class for Appwrite integration"""
    
    def __init__(self, config: Dict[str, str]):
        """Initialize Appwrite service with configuration"""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize Appwrite client
        self.client = Client()
        self.client.set_endpoint(config['APPWRITE_ENDPOINT'])
        self.client.set_project(config['APPWRITE_PROJECT_ID'])
        self.client.set_key(config['APPWRITE_API_KEY'])
        
        # Initialize services
        self.databases = Databases(self.client)
        self.storage = Storage(self.client)
        
        self.database_id = config['APPWRITE_DATABASE_ID']
    
    def test_connection(self) -> bool:
        """Test connection to Appwrite"""
        try:
            # Try to list collections to test connection
            self.databases.list_collections(self.database_id)
            return True
        except Exception as e:
            self.logger.error(f"Appwrite connection test failed: {e}")
            return False
    
    # Tower operations
    async def get_towers(self) -> List[Dict[str, Any]]:
        """Get all towers"""
        try:
            response = self.databases.list_documents(
                self.database_id,
                'towers'
            )
            return response['documents']
        except AppwriteException as e:
            self.logger.error(f"Error fetching towers: {e}")
            return []
    
    async def get_tower(self, tower_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific tower"""
        try:
            response = self.databases.get_document(
                self.database_id,
                'towers',
                tower_id
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error fetching tower {tower_id}: {e}")
            return None
    
    async def create_tower(self, tower_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new tower"""
        try:
            response = self.databases.create_document(
                self.database_id,
                'towers',
                tower_data
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error creating tower: {e}")
            return None
    
    async def update_tower(self, tower_id: str, tower_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a tower"""
        try:
            response = self.databases.update_document(
                self.database_id,
                'towers',
                tower_id,
                tower_data
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error updating tower {tower_id}: {e}")
            return None
    
    # Camera operations
    async def get_cameras(self, tower_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get cameras, optionally filtered by tower"""
        try:
            if tower_id:
                response = self.databases.list_documents(
                    self.database_id,
                    'cameras',
                    queries=[f'tower_id={tower_id}']
                )
            else:
                response = self.databases.list_documents(
                    self.database_id,
                    'cameras'
                )
            return response['documents']
        except AppwriteException as e:
            self.logger.error(f"Error fetching cameras: {e}")
            return []
    
    async def get_camera(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific camera"""
        try:
            response = self.databases.get_document(
                self.database_id,
                'cameras',
                camera_id
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error fetching camera {camera_id}: {e}")
            return None
    
    async def create_camera(self, camera_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new camera"""
        try:
            response = self.databases.create_document(
                self.database_id,
                'cameras',
                camera_data
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error creating camera: {e}")
            return None
    
    # Alarm operations
    async def get_alarms(self, limit: int = 50, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get alarms with optional filtering"""
        try:
            queries = [f'limit({limit})', 'orderDesc("timestamp")']
            if status:
                queries.append(f'status={status}')
                
            response = self.databases.list_documents(
                self.database_id,
                'alarms',
                queries=queries
            )
            return response['documents']
        except AppwriteException as e:
            self.logger.error(f"Error fetching alarms: {e}")
            return []
    
    async def get_alarm(self, alarm_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific alarm"""
        try:
            response = self.databases.get_document(
                self.database_id,
                'alarms',
                alarm_id
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error fetching alarm {alarm_id}: {e}")
            return None
    
    async def create_alarm(self, alarm_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new alarm"""
        try:
            response = self.databases.create_document(
                self.database_id,
                'alarms',
                alarm_data
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error creating alarm: {e}")
            return None
    
    async def update_alarm(self, alarm_id: str, alarm_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an alarm (e.g., acknowledge)"""
        try:
            response = self.databases.update_document(
                self.database_id,
                'alarms',
                alarm_id,
                alarm_data
            )
            return response
        except AppwriteException as e:
            self.logger.error(f"Error updating alarm {alarm_id}: {e}")
            return None
    
    # Dashboard statistics
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        try:
            # Get counts for different entities
            towers_count = len(await self.get_towers())
            cameras_count = len(await self.get_cameras())
            active_alarms = len(await self.get_alarms(status='new'))
            
            # Get recent alarms
            recent_alarms = await self.get_alarms(limit=10)
            
            return {
                'towers_count': towers_count,
                'cameras_count': cameras_count,
                'active_alarms_count': active_alarms,
                'recent_alarms': recent_alarms,
                'system_status': 'operational'
            }
        except Exception as e:
            self.logger.error(f"Error getting dashboard stats: {e}")
            return {
                'towers_count': 0,
                'cameras_count': 0,
                'active_alarms_count': 0,
                'recent_alarms': [],
                'system_status': 'error'
            }
    
    # Storage operations
    async def upload_file(self, file_data: bytes, filename: str, bucket_id: str = 'surveillance-media') -> Optional[str]:
        """Upload a file to Appwrite storage"""
        try:
            response = self.storage.create_file(
                bucket_id,
                filename,
                file_data
            )
            return response['$id']
        except AppwriteException as e:
            self.logger.error(f"Error uploading file {filename}: {e}")
            return None
    
    async def get_file_url(self, file_id: str, bucket_id: str = 'surveillance-media') -> Optional[str]:
        """Get file download URL"""
        try:
            return self.storage.get_file_download(bucket_id, file_id)
        except AppwriteException as e:
            self.logger.error(f"Error getting file URL {file_id}: {e}")
            return None
