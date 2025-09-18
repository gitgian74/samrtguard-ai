"""
Alarms API routes
Handles alarm management and notifications
"""

from flask import Blueprint, jsonify, request
from src.services.appwrite_service import AppwriteService
from src.models.surveillance import db, Alarm, Camera
import asyncio
from datetime import datetime

alarms_bp = Blueprint('alarms', __name__)

# Initialize Appwrite service (will be set by main app)
appwrite_service = None

def init_appwrite_service(service):
    """Initialize Appwrite service"""
    global appwrite_service
    appwrite_service = service

@alarms_bp.route('/', methods=['GET'])
def get_alarms():
    """Get alarms with optional filtering"""
    try:
        # Get query parameters
        limit = int(request.args.get('limit', 50))
        status = request.args.get('status')
        camera_id = request.args.get('camera_id')
        
        # Try to get from Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            alarms_data = loop.run_until_complete(appwrite_service.get_alarms(limit, status))
            loop.close()
            
            if alarms_data:
                # Filter by camera_id if specified
                if camera_id:
                    alarms_data = [alarm for alarm in alarms_data if alarm.get('camera_id') == camera_id]
                
                return jsonify({
                    'success': True,
                    'data': alarms_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        query = Alarm.query.order_by(Alarm.timestamp.desc())
        
        if status:
            query = query.filter_by(status=status)
        if camera_id:
            query = query.filter_by(camera_id=camera_id)
        
        alarms = query.limit(limit).all()
        alarms_data = [alarm.to_dict() for alarm in alarms]
        
        return jsonify({
            'success': True,
            'data': alarms_data,
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@alarms_bp.route('/<alarm_id>', methods=['GET'])
def get_alarm(alarm_id):
    """Get a specific alarm"""
    try:
        # Try Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            alarm_data = loop.run_until_complete(appwrite_service.get_alarm(alarm_id))
            loop.close()
            
            if alarm_data:
                return jsonify({
                    'success': True,
                    'data': alarm_data,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        alarm = Alarm.query.get(alarm_id)
        if not alarm:
            return jsonify({
                'success': False,
                'error': 'Alarm not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': alarm.to_dict(),
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@alarms_bp.route('/', methods=['POST'])
def create_alarm():
    """Create a new alarm"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['camera_id', 'type', 'confidence']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate camera exists
        camera = Camera.query.get(data['camera_id'])
        if not camera:
            return jsonify({
                'success': False,
                'error': 'Camera not found'
            }), 404
        
        # Set defaults
        alarm_data = {
            'camera_id': data['camera_id'],
            'type': data['type'],
            'confidence': float(data['confidence']),
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'image_url': data.get('image_url'),
            'video_url': data.get('video_url'),
            'status': data.get('status', 'new')
        }
        
        # Try to create in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.create_alarm(alarm_data))
            loop.close()
            
            if result:
                # Also save to local database for caching
                alarm = Alarm(
                    id=result['$id'],
                    camera_id=alarm_data['camera_id'],
                    type=alarm_data['type'],
                    confidence=alarm_data['confidence'],
                    timestamp=datetime.fromisoformat(alarm_data['timestamp'].replace('Z', '+00:00')),
                    image_url=alarm_data.get('image_url'),
                    video_url=alarm_data.get('video_url'),
                    status=alarm_data['status']
                )
                db.session.add(alarm)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Alarm created successfully'
                }), 201
        
        # Fallback to local database only
        alarm = Alarm(
            id=f"alarm-{datetime.utcnow().timestamp()}",
            camera_id=alarm_data['camera_id'],
            type=alarm_data['type'],
            confidence=alarm_data['confidence'],
            timestamp=datetime.fromisoformat(alarm_data['timestamp'].replace('Z', '+00:00')),
            image_url=alarm_data.get('image_url'),
            video_url=alarm_data.get('video_url'),
            status=alarm_data['status']
        )
        
        db.session.add(alarm)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': alarm.to_dict(),
            'message': 'Alarm created successfully (local only)'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@alarms_bp.route('/<alarm_id>/acknowledge', methods=['POST'])
def acknowledge_alarm(alarm_id):
    """Acknowledge an alarm"""
    try:
        data = request.get_json() or {}
        acknowledged_by = data.get('acknowledged_by', 'system')
        
        acknowledge_data = {
            'status': 'acknowledged',
            'acknowledged_by': acknowledged_by,
            'acknowledged_at': datetime.utcnow().isoformat()
        }
        
        # Try to update in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.update_alarm(alarm_id, acknowledge_data))
            loop.close()
            
            if result:
                # Also update local database
                alarm = Alarm.query.get(alarm_id)
                if alarm:
                    alarm.status = 'acknowledged'
                    alarm.acknowledged_by = acknowledged_by
                    alarm.acknowledged_at = datetime.utcnow()
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Alarm acknowledged successfully'
                })
        
        # Fallback to local database
        alarm = Alarm.query.get(alarm_id)
        if not alarm:
            return jsonify({
                'success': False,
                'error': 'Alarm not found'
            }), 404
        
        alarm.status = 'acknowledged'
        alarm.acknowledged_by = acknowledged_by
        alarm.acknowledged_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': alarm.to_dict(),
            'message': 'Alarm acknowledged successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@alarms_bp.route('/<alarm_id>/resolve', methods=['POST'])
def resolve_alarm(alarm_id):
    """Resolve an alarm"""
    try:
        data = request.get_json() or {}
        resolved_by = data.get('resolved_by', 'system')
        
        resolve_data = {
            'status': 'resolved',
            'acknowledged_by': resolved_by,
            'acknowledged_at': datetime.utcnow().isoformat()
        }
        
        # Try to update in Appwrite
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(appwrite_service.update_alarm(alarm_id, resolve_data))
            loop.close()
            
            if result:
                # Also update local database
                alarm = Alarm.query.get(alarm_id)
                if alarm:
                    alarm.status = 'resolved'
                    alarm.acknowledged_by = resolved_by
                    alarm.acknowledged_at = datetime.utcnow()
                    db.session.commit()
                
                return jsonify({
                    'success': True,
                    'data': result,
                    'message': 'Alarm resolved successfully'
                })
        
        # Fallback to local database
        alarm = Alarm.query.get(alarm_id)
        if not alarm:
            return jsonify({
                'success': False,
                'error': 'Alarm not found'
            }), 404
        
        alarm.status = 'resolved'
        alarm.acknowledged_by = resolved_by
        alarm.acknowledged_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': alarm.to_dict(),
            'message': 'Alarm resolved successfully (local only)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@alarms_bp.route('/statistics', methods=['GET'])
def get_alarm_statistics():
    """Get alarm statistics"""
    try:
        # Get statistics from local database
        total_alarms = Alarm.query.count()
        new_alarms = Alarm.query.filter_by(status='new').count()
        acknowledged_alarms = Alarm.query.filter_by(status='acknowledged').count()
        resolved_alarms = Alarm.query.filter_by(status='resolved').count()
        
        # Get alarms by type
        alarm_types = db.session.query(
            Alarm.type, 
            db.func.count(Alarm.id).label('count')
        ).group_by(Alarm.type).all()
        
        # Get recent alarms (last 24 hours)
        from datetime import timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_alarms = Alarm.query.filter(Alarm.timestamp >= yesterday).count()
        
        statistics = {
            'total_alarms': total_alarms,
            'new_alarms': new_alarms,
            'acknowledged_alarms': acknowledged_alarms,
            'resolved_alarms': resolved_alarms,
            'recent_alarms_24h': recent_alarms,
            'alarm_types': [{'type': t[0], 'count': t[1]} for t in alarm_types],
            'resolution_rate': round((resolved_alarms / max(total_alarms, 1)) * 100, 2)
        }
        
        return jsonify({
            'success': True,
            'data': statistics
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
