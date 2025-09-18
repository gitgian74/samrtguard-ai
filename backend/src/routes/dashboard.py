"""
Dashboard API routes
Provides dashboard statistics and overview data
"""

from flask import Blueprint, jsonify, request
from src.services.appwrite_service import AppwriteService
from src.models.surveillance import db, Tower, Camera, Alarm
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

# Initialize Appwrite service (will be set by main app)
appwrite_service = None

def init_appwrite_service(service):
    """Initialize Appwrite service"""
    global appwrite_service
    appwrite_service = service

@dashboard_bp.route('/overview', methods=['GET'])
def get_dashboard_overview():
    """Get dashboard overview statistics"""
    try:
        # Try to get from Appwrite first
        if appwrite_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            stats = loop.run_until_complete(appwrite_service.get_dashboard_stats())
            loop.close()
            
            if stats:
                return jsonify({
                    'success': True,
                    'data': stats,
                    'source': 'appwrite'
                })
        
        # Fallback to local database
        towers_count = Tower.query.count()
        cameras_count = Camera.query.count()
        active_cameras = Camera.query.filter_by(status='active').count()
        online_towers = Tower.query.filter_by(status='online').count()
        
        # Alarm statistics
        total_alarms = Alarm.query.count()
        new_alarms = Alarm.query.filter_by(status='new').count()
        
        # Recent alarms (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_alarms = Alarm.query.filter(Alarm.timestamp >= yesterday).limit(10).all()
        
        overview_data = {
            'towers_count': towers_count,
            'towers_online': online_towers,
            'cameras_count': cameras_count,
            'cameras_active': active_cameras,
            'total_alarms': total_alarms,
            'active_alarms_count': new_alarms,
            'recent_alarms': [alarm.to_dict() for alarm in recent_alarms],
            'system_status': 'operational' if online_towers > 0 else 'offline',
            'last_updated': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': overview_data,
            'source': 'local'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/statistics', methods=['GET'])
def get_dashboard_statistics():
    """Get detailed dashboard statistics"""
    try:
        # Time range for statistics
        days = int(request.args.get('days', 7))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Alarm statistics by day
        alarm_stats = db.session.query(
            func.date(Alarm.timestamp).label('date'),
            func.count(Alarm.id).label('count')
        ).filter(
            Alarm.timestamp >= start_date
        ).group_by(
            func.date(Alarm.timestamp)
        ).all()
        
        # Alarm statistics by type
        alarm_types = db.session.query(
            Alarm.type,
            func.count(Alarm.id).label('count')
        ).filter(
            Alarm.timestamp >= start_date
        ).group_by(Alarm.type).all()
        
        # Camera status distribution
        camera_status = db.session.query(
            Camera.status,
            func.count(Camera.id).label('count')
        ).group_by(Camera.status).all()
        
        # Tower status distribution
        tower_status = db.session.query(
            Tower.status,
            func.count(Tower.id).label('count')
        ).group_by(Tower.status).all()
        
        # Average response time (mock data for now)
        avg_response_time = 2.5  # minutes
        
        statistics = {
            'time_range_days': days,
            'alarm_trends': [
                {
                    'date': str(stat.date),
                    'count': stat.count
                } for stat in alarm_stats
            ],
            'alarm_types': [
                {
                    'type': stat.type,
                    'count': stat.count
                } for stat in alarm_types
            ],
            'camera_status': [
                {
                    'status': stat.status,
                    'count': stat.count
                } for stat in camera_status
            ],
            'tower_status': [
                {
                    'status': stat.status,
                    'count': stat.count
                } for stat in tower_status
            ],
            'performance_metrics': {
                'avg_response_time_minutes': avg_response_time,
                'system_uptime_percentage': 98.5,
                'detection_accuracy': 94.2
            }
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

@dashboard_bp.route('/alerts', methods=['GET'])
def get_dashboard_alerts():
    """Get system alerts and notifications"""
    try:
        # Get recent alarms that need attention
        critical_alarms = Alarm.query.filter_by(status='new').filter(
            Alarm.confidence >= 0.8
        ).order_by(Alarm.timestamp.desc()).limit(5).all()
        
        # Check for offline towers
        offline_towers = Tower.query.filter_by(status='offline').all()
        
        # Check for inactive cameras
        inactive_cameras = Camera.query.filter_by(status='inactive').all()
        
        # System health checks
        alerts = []
        
        # Critical alarms
        for alarm in critical_alarms:
            alerts.append({
                'type': 'critical_alarm',
                'severity': 'high',
                'message': f'High confidence {alarm.type} detection on {alarm.camera.name}',
                'timestamp': alarm.timestamp.isoformat(),
                'data': alarm.to_dict()
            })
        
        # Offline towers
        for tower in offline_towers:
            alerts.append({
                'type': 'tower_offline',
                'severity': 'medium',
                'message': f'Tower {tower.name} is offline',
                'timestamp': tower.updated_at.isoformat() if tower.updated_at else None,
                'data': tower.to_dict()
            })
        
        # Inactive cameras
        if len(inactive_cameras) > 0:
            alerts.append({
                'type': 'cameras_inactive',
                'severity': 'low',
                'message': f'{len(inactive_cameras)} cameras are inactive',
                'timestamp': datetime.utcnow().isoformat(),
                'data': {'count': len(inactive_cameras)}
            })
        
        # System status
        system_health = {
            'overall_status': 'healthy' if len(alerts) == 0 else 'warning',
            'alerts_count': len(alerts),
            'critical_alerts': len([a for a in alerts if a['severity'] == 'high']),
            'last_check': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': {
                'alerts': alerts,
                'system_health': system_health
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/live-feed', methods=['GET'])
def get_live_feed():
    """Get live feed data for real-time dashboard updates"""
    try:
        # Get recent activity (last 5 minutes)
        recent_time = datetime.utcnow() - timedelta(minutes=5)
        
        recent_alarms = Alarm.query.filter(
            Alarm.timestamp >= recent_time
        ).order_by(Alarm.timestamp.desc()).limit(10).all()
        
        # Get active cameras
        active_cameras = Camera.query.filter_by(status='active').all()
        
        # Get online towers
        online_towers = Tower.query.filter_by(status='online').all()
        
        live_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'recent_activity': [alarm.to_dict() for alarm in recent_alarms],
            'active_cameras': len(active_cameras),
            'online_towers': len(online_towers),
            'system_load': {
                'cpu_usage': 45.2,  # Mock data
                'memory_usage': 62.8,
                'storage_usage': 34.1
            },
            'network_status': {
                'bandwidth_usage': 78.5,
                'latency_ms': 12.3,
                'packet_loss': 0.1
            }
        }
        
        return jsonify({
            'success': True,
            'data': live_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/export', methods=['POST'])
def export_dashboard_data():
    """Export dashboard data for reporting"""
    try:
        data = request.get_json() or {}
        export_type = data.get('type', 'summary')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        # Parse dates
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
            
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_date = datetime.utcnow()
        
        # Get data based on export type
        if export_type == 'alarms':
            alarms = Alarm.query.filter(
                Alarm.timestamp.between(start_date, end_date)
            ).all()
            
            export_data = {
                'type': 'alarms_report',
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'data': [alarm.to_dict() for alarm in alarms],
                'summary': {
                    'total_alarms': len(alarms),
                    'by_type': {}
                }
            }
            
        elif export_type == 'towers':
            towers = Tower.query.all()
            export_data = {
                'type': 'towers_report',
                'data': [tower.to_dict() for tower in towers],
                'summary': {
                    'total_towers': len(towers),
                    'online_towers': len([t for t in towers if t.status == 'online'])
                }
            }
            
        else:  # summary
            export_data = {
                'type': 'summary_report',
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'summary': {
                    'towers': Tower.query.count(),
                    'cameras': Camera.query.count(),
                    'alarms': Alarm.query.filter(
                        Alarm.timestamp.between(start_date, end_date)
                    ).count()
                }
            }
        
        export_data['generated_at'] = datetime.utcnow().isoformat()
        export_data['generated_by'] = 'surveillance_system'
        
        return jsonify({
            'success': True,
            'data': export_data,
            'message': 'Data exported successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
