"""
Cameras API routes
Handles camera management and monitoring
"""

from flask import Blueprint, jsonify, request
from src.services.appwrite_service import AppwriteService
from src.models.surveillance import db, Camera, Tower
import asyncio
from datetime import datetime

cameras_bp = Blueprint('cameras', __name__)

# Initialize Appwrite service (will be set by main app)
appwrite_service = None

def init_appwrite_service(service):
    """Initialize Appwrite service"""
    global appwrite_service
    appwrite_service = service

@cameras_bp.route('/', methods=['GET'])
def get_cameras():
    """Get all cameras or cameras for a specific tower"""
    try:
        tower_id = request.args.get('tower_id')
        
        # Try to get from Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            cameras_data = loop.run_until_complete(appwrite_service.get_cameras(tower_id))
            loop.close()
            
            if cameras_data:
                return jsonify({
                    'success': True,
                    'data': cameras_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        query = Camera.query
        if tower_id:
            query = query.filter_by(tower_id=tower_id)
        
        cameras = query.all()
        cameras_data = [camera.to_dict() for camera in cameras]
        
        return jsonify({
            'success': True,
            'data': cameras_data,
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/<camera_id>', methods=['GET'])
def get_camera(camera_id):
    """Get a specific camera"""
    try:
        # Try Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            camera_data = loop.run_until_complete(appwrite_service.get_camera(camera_id))
            loop.close()
            
            if camera_data:
                return jsonify({
                    'success': True,
                    'data': camera_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': camera.to_dict(),
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/', methods=['POST'])
def create_camera():
    """Create a new camera"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['tower_id', 'name', 'rtsp_url']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate tower exists
        tower = Tower.query.get(data['tower_id'])
        if not tower:
            return jsonify({
                'success': False,
                'error': 'Tower not found'
            }), 404
        
        # Set defaults
        camera_data = {
            'tower_id': data['tower_id'],
            'name': data['name'],
            'rtsp_url': data['rtsp_url'],
            'resolution': data.get('resolution', '1920x1080'),
            'fps': data.get('fps', 30),
            'status': data.get('status', 'inactive')
        }
        
        # Try to create in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.create_camera(camera_data))
            loop.close()
            
            if result:
                # Also save to local database for caching
                camera = Camera(
                    id=result['$id'],
                    tower_id=camera_data['tower_id'],
                    name=camera_data['name'],
                    rtsp_url=camera_data['rtsp_url'],
                    resolution=camera_data['resolution'],
                    fps=camera_data['fps'],
                    status=camera_data['status']
                )
                db.session.add(camera)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Camera created successfully'
                }), 201
        
        # Fallback to local database only
        camera = Camera(
            id=f"camera-{datetime.utcnow().timestamp()}",
            tower_id=camera_data['tower_id'],
            name=camera_data['name'],
            rtsp_url=camera_data['rtsp_url'],
            resolution=camera_data['resolution'],
            fps=camera_data['fps'],
            status=camera_data['status']
        )
        
        db.session.add(camera)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': camera.to_dict(),
            'message': 'Camera created successfully (local only)'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/<camera_id>', methods=['PUT'])
def update_camera(camera_id):
    """Update a camera"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Try to update in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.update_camera(camera_id, data))
            loop.close()
            
            if result:
                # Also update local database
                camera = Camera.query.get(camera_id)
                if camera:
                    for key, value in data.items():
                        if hasattr(camera, key):
                            setattr(camera, key, value)
                    camera.updated_at = datetime.utcnow()
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Camera updated successfully'
                })
        
        # Fallback to local database only
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        for key, value in data.items():
            if hasattr(camera, key):
                setattr(camera, key, value)
        
        camera.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': camera.to_dict(),
            'message': 'Camera updated successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/<camera_id>/status', methods=['POST'])
def update_camera_status(camera_id):
    """Update camera status"""
    try:
        data = request.get_json()
        status = data.get('status', 'active')
        
        status_data = {
            'status': status,
            'last_seen': datetime.utcnow().isoformat()
        }
        
        # Try to update in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.update_camera(camera_id, status_data))
            loop.close()
            
            if result:
                # Also update local database
                camera = Camera.query.get(camera_id)
                if camera:
                    camera.status = status
                    camera.last_seen = datetime.utcnow()
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Camera status updated successfully'
                })
        
        # Fallback to local database
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        camera.status = status
        camera.last_seen = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Camera status updated successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/<camera_id>/stream', methods=['GET'])
def get_camera_stream(camera_id):
    """Get camera stream information"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        # In a real implementation, you would generate WebRTC or HLS stream URLs
        stream_data = {
            'camera_id': camera_id,
            'rtsp_url': camera.rtsp_url,
            'webrtc_url': f'/api/stream/webrtc/{camera_id}',
            'hls_url': f'/api/stream/hls/{camera_id}/playlist.m3u8',
            'snapshot_url': f'/api/cameras/{camera_id}/snapshot',
            'resolution': camera.resolution,
            'fps': camera.fps,
            'status': camera.status
        }
        
        return jsonify({
            'success': True,
            'data': stream_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cameras_bp.route('/<camera_id>/snapshot', methods=['GET'])
def get_camera_snapshot(camera_id):
    """Get camera snapshot"""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        # In a real implementation, you would capture a frame from the camera
        # For now, return a placeholder response
        snapshot_data = {
            'camera_id': camera_id,
            'timestamp': datetime.utcnow().isoformat(),
            'url': f'/api/media/snapshots/{camera_id}/latest.jpg',
            'message': 'Snapshot functionality requires camera integration'
        }
        
        return jsonify({
            'success': True,
            'data': snapshot_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
