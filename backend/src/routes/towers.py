"""
Towers API routes
Handles tower management and monitoring
"""

from flask import Blueprint, jsonify, request
from src.services.appwrite_service import AppwriteService
from src.models.surveillance import db, Tower
import asyncio
from datetime import datetime

towers_bp = Blueprint('towers', __name__)

# Initialize Appwrite service (will be set by main app)
appwrite_service = None

def init_appwrite_service(service):
    """Initialize Appwrite service"""
    global appwrite_service
    appwrite_service = service

@towers_bp.route('/', methods=['GET'])
def get_towers():
    """Get all towers"""
    try:
        # Try to get from Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            towers_data = loop.run_until_complete(appwrite_service.get_towers())
            loop.close()
            
            if towers_data:
                return jsonify({
                    'success': True,
                    'data': towers_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        towers = Tower.query.all()
        towers_data = [tower.to_dict() for tower in towers]
        
        return jsonify({
            'success': True,
            'data': towers_data,
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@towers_bp.route('/<tower_id>', methods=['GET'])
def get_tower(tower_id):
    """Get a specific tower"""
    try:
        # Try Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            tower_data = loop.run_until_complete(appwrite_service.get_tower(tower_id))
            loop.close()
            
            if tower_data:
                return jsonify({
                    'success': True,
                    'data': tower_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        tower = Tower.query.get(tower_id)
        if not tower:
            return jsonify({
                'success': False,
                'error': 'Tower not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': tower.to_dict(),
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@towers_bp.route('/', methods=['POST'])
def create_tower():
    """Create a new tower"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'ip_address']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Set defaults
        tower_data = {
            'area_id': data.get('area_id', 'default-area'),
            'name': data['name'],
            'location': data.get('location', ''),
            'ip_address': data['ip_address'],
            'status': data.get('status', 'offline'),
            'last_heartbeat': datetime.utcnow().isoformat()
        }
        
        # Try to create in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.create_tower(tower_data))
            loop.close()
            
            if result:
                # Also save to local database for caching
                tower = Tower(
                    id=result['$id'],
                    area_id=tower_data['area_id'],
                    name=tower_data['name'],
                    location=tower_data['location'],
                    ip_address=tower_data['ip_address'],
                    status=tower_data['status']
                )
                db.session.add(tower)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Tower created successfully'
                }), 201
        
        # Fallback to local database only
        tower = Tower(
            id=f"tower-{datetime.utcnow().timestamp()}",
            area_id=tower_data['area_id'],
            name=tower_data['name'],
            location=tower_data['location'],
            ip_address=tower_data['ip_address'],
            status=tower_data['status']
        )
        
        db.session.add(tower)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': tower.to_dict(),
            'message': 'Tower created successfully (local only)'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@towers_bp.route('/<tower_id>', methods=['PUT'])
def update_tower(tower_id):
    """Update a tower"""
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
            result = loop.run_until_complete(appwrite_service.update_tower(tower_id, data))
            loop.close()
            
            if result:
                # Also update local database
                tower = Tower.query.get(tower_id)
                if tower:
                    for key, value in data.items():
                        if hasattr(tower, key):
                            setattr(tower, key, value)
                    tower.updated_at = datetime.utcnow()
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Tower updated successfully'
                })
        
        # Fallback to local database only
        tower = Tower.query.get(tower_id)
        if not tower:
            return jsonify({
                'success': False,
                'error': 'Tower not found'
            }), 404
        
        for key, value in data.items():
            if hasattr(tower, key):
                setattr(tower, key, value)
        
        tower.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': tower.to_dict(),
            'message': 'Tower updated successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@towers_bp.route('/<tower_id>/heartbeat', methods=['POST'])
def tower_heartbeat(tower_id):
    """Update tower heartbeat"""
    try:
        heartbeat_data = {
            'last_heartbeat': datetime.utcnow().isoformat(),
            'status': 'online'
        }
        
        # Try to update in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.update_tower(tower_id, heartbeat_data))
            loop.close()
            
            if result:
                # Also update local database
                tower = Tower.query.get(tower_id)
                if tower:
                    tower.last_heartbeat = datetime.utcnow()
                    tower.status = 'online'
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Heartbeat updated successfully'
                })
        
        # Fallback to local database
        tower = Tower.query.get(tower_id)
        if not tower:
            return jsonify({
                'success': False,
                'error': 'Tower not found'
            }), 404
        
        tower.last_heartbeat = datetime.utcnow()
        tower.status = 'online'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Heartbeat updated successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@towers_bp.route('/list', methods=['GET'])
def list_towers():
    """List all towers - alias for get_towers for frontend compatibility"""
    return get_towers()

@towers_bp.route('/<tower_id>/status', methods=['GET'])
def get_tower_status(tower_id):
    """Get tower status and statistics"""
    try:
        # Get tower info
        tower = Tower.query.get(tower_id)
        if not tower:
            return jsonify({
                'success': False,
                'error': 'Tower not found'
            }), 404
        
        # Get related statistics
        cameras_count = len(tower.cameras)
        active_cameras = len([c for c in tower.cameras if c.status == 'active'])
        
        # Calculate uptime
        uptime_hours = 0
        if tower.last_heartbeat:
            uptime_delta = datetime.utcnow() - tower.last_heartbeat
            uptime_hours = max(0, 24 - (uptime_delta.total_seconds() / 3600))
        
        status_data = {
            'tower': tower.to_dict(),
            'statistics': {
                'cameras_total': cameras_count,
                'cameras_active': active_cameras,
                'cameras_offline': cameras_count - active_cameras,
                'uptime_hours': round(uptime_hours, 2),
                'status': tower.status
            }
        }
        
        return jsonify({
            'success': True,
            'data': status_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
