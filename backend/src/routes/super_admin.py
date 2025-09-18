from flask import Blueprint, request, jsonify
import asyncio
import json
from datetime import datetime

# Import VIAM SDK for testing connections
try:
    from viam.robot.client import RobotClient
    from viam.components.camera import Camera
    from viam.services.vision import VisionClient
    VIAM_AVAILABLE = True
except ImportError:
    VIAM_AVAILABLE = False
    print("VIAM SDK not available - tower connection testing will be simulated")

super_admin_bp = Blueprint('super_admin', __name__)

@super_admin_bp.route('/api/towers/list', methods=['GET'])
def list_towers():
    """Get all towers for super admin"""
    try:
        # Mock data for now - in production this would come from Appwrite
        towers = [
            {
                "id": "tower_001",
                "name": "Torre Centro",
                "code": "SGT01",
                "description": "Torre di sorveglianza centro storico",
                "status": "active",
                "location": {
                    "latitude": 45.4642,
                    "longitude": 9.1900,
                    "address": "Via Roma 123, Milano",
                    "zone": "Centro Storico"
                },
                "viam_config": {
                    "machine_address": "sgt01-main.1j0se98dbn.viam.cloud",
                    "api_key": "***hidden***",
                    "api_key_id": "***hidden***"
                },
                "cameras": [
                    {"name": "camera-1", "type": "ip_camera", "resolution": "1920x1080", "fps": 30},
                    {"name": "camera-2", "type": "ip_camera", "resolution": "1920x1080", "fps": 30}
                ],
                "ai_settings": {
                    "confidence_threshold": 0.7,
                    "detection_classes": ["person", "vehicle", "weapon"],
                    "models": ["yolo", "effdet"]
                },
                "assigned_users": [
                    {"email": "operatore1@azienda.com", "role": "operator"},
                    {"email": "supervisore@azienda.com", "role": "supervisor"}
                ],
                "created_at": "2025-01-15T10:00:00Z",
                "last_connection": "2025-01-18T09:30:00Z"
            }
        ]
        
        return jsonify({
            "success": True,
            "towers": towers,
            "total": len(towers)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/towers/create', methods=['POST'])
def create_tower():
    """Create a new surveillance tower"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'code', 'viam_config']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        # Validate VIAM config
        viam_config = data['viam_config']
        required_viam_fields = ['machine_address', 'api_key', 'api_key_id']
        for field in required_viam_fields:
            if field not in viam_config:
                return jsonify({
                    "success": False,
                    "error": f"Missing VIAM config field: {field}"
                }), 400
        
        # Create tower object
        tower = {
            "id": f"tower_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "name": data['name'],
            "code": data['code'],
            "description": data.get('description', ''),
            "status": "active",
            "location": data.get('location', {}),
            "viam_config": {
                "machine_address": viam_config['machine_address'],
                "api_key": viam_config['api_key'],
                "api_key_id": viam_config['api_key_id']
            },
            "cameras": data.get('cameras', []),
            "ai_settings": data.get('ai_settings', {
                "confidence_threshold": 0.7,
                "detection_classes": ["person", "vehicle"],
                "models": ["yolo"]
            }),
            "notification_settings": data.get('notification_settings', {
                "email_enabled": True,
                "sms_enabled": True,
                "escalation_time": 300
            }),
            "assigned_users": [],
            "created_at": datetime.now().isoformat(),
            "last_connection": None
        }
        
        # In production, save to Appwrite database
        # For now, return success with the created tower
        
        return jsonify({
            "success": True,
            "tower": tower,
            "message": "Torre creata con successo"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/towers/test-connection', methods=['POST'])
def test_viam_connection():
    """Test VIAM connection for a tower"""
    try:
        data = request.get_json()
        
        machine_address = data.get('machine_address')
        api_key = data.get('api_key')
        api_key_id = data.get('api_key_id')
        
        if not all([machine_address, api_key, api_key_id]):
            return jsonify({
                "success": False,
                "error": "Missing VIAM connection parameters"
            }), 400
        
        if not VIAM_AVAILABLE:
            # Simulate connection test when VIAM SDK is not available
            return jsonify({
                "success": True,
                "message": "VIAM connection test simulated (SDK not available)",
                "resources": [
                    "camera-1",
                    "camera-2", 
                    "video-store-camera-1",
                    "transform",
                    "ml_model_service",
                    "vision-yolo",
                    "vision-effdet"
                ],
                "simulated": True
            })
        
        # Real VIAM connection test
        async def test_connection():
            try:
                opts = RobotClient.Options.with_api_key(
                    api_key=api_key,
                    api_key_id=api_key_id
                )
                
                machine = await RobotClient.at_address(machine_address, opts)
                resources = machine.resource_names
                
                # Test basic functionality
                resource_list = []
                for resource in resources:
                    resource_list.append(str(resource))
                
                await machine.close()
                
                return {
                    "success": True,
                    "message": "VIAM connection successful",
                    "resources": resource_list,
                    "simulated": False
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"VIAM connection failed: {str(e)}",
                    "simulated": False
                }
        
        # Run async test
        result = asyncio.run(test_connection())
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Connection test error: {str(e)}"
        }), 500

@super_admin_bp.route('/api/towers/assign-user', methods=['POST'])
def assign_user_to_tower():
    """Assign a user to a tower with specific permissions"""
    try:
        data = request.get_json()
        
        required_fields = ['tower_id', 'user_email', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        # Create user assignment
        assignment = {
            "id": f"assignment_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "tower_id": data['tower_id'],
            "user_email": data['user_email'],
            "role": data['role'],
            "permissions": data.get('permissions', {
                "view_live": True,
                "receive_alerts": True,
                "control_cameras": False
            }),
            "notifications": data.get('notifications', {
                "email": True,
                "sms": False,
                "phone": ""
            }),
            "assigned_at": datetime.now().isoformat(),
            "assigned_by": "super_admin"  # In production, get from auth context
        }
        
        # In production, save to Appwrite database
        # Also send notification email to user
        
        return jsonify({
            "success": True,
            "assignment": assignment,
            "message": "Utente assegnato con successo alla torre"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/users/list', methods=['GET'])
def list_users():
    """Get all users for super admin"""
    try:
        # Mock data for now - in production this would come from Appwrite
        users = [
            {
                "id": "user_001",
                "name": "Mario Rossi",
                "email": "mario.rossi@azienda.com",
                "role": "operator",
                "assigned_towers": ["tower_001"],
                "notifications": {
                    "email": True,
                    "sms": True,
                    "phone": "+39123456789"
                },
                "created_at": "2025-01-10T10:00:00Z",
                "last_login": "2025-01-18T08:30:00Z",
                "status": "active"
            },
            {
                "id": "user_002", 
                "name": "Laura Bianchi",
                "email": "laura.bianchi@azienda.com",
                "role": "supervisor",
                "assigned_towers": ["tower_001"],
                "notifications": {
                    "email": True,
                    "sms": False,
                    "phone": "+39987654321"
                },
                "created_at": "2025-01-12T14:00:00Z",
                "last_login": "2025-01-18T09:15:00Z",
                "status": "active"
            }
        ]
        
        return jsonify({
            "success": True,
            "users": users,
            "total": len(users)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/towers/<tower_id>/status', methods=['GET'])
def get_tower_status(tower_id):
    """Get real-time status of a specific tower"""
    try:
        # Mock real-time data
        status = {
            "tower_id": tower_id,
            "status": "active",
            "last_heartbeat": datetime.now().isoformat(),
            "cameras": {
                "total": 2,
                "active": 2,
                "offline": 0
            },
            "ai_detection": {
                "status": "running",
                "last_detection": "2025-01-18T09:45:00Z",
                "detections_today": 15
            },
            "alerts": {
                "active": 0,
                "today": 3,
                "this_week": 12
            },
            "system_health": {
                "cpu_usage": 45,
                "memory_usage": 62,
                "disk_usage": 78,
                "network_status": "connected"
            }
        }
        
        return jsonify({
            "success": True,
            "status": status
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/towers/<tower_id>/alerts', methods=['GET'])
def get_tower_alerts(tower_id):
    """Get alerts for a specific tower"""
    try:
        # Mock alerts data
        alerts = [
            {
                "id": "alert_001",
                "tower_id": tower_id,
                "type": "person_detected",
                "severity": "medium",
                "message": "Persona rilevata in zona riservata",
                "timestamp": "2025-01-18T09:45:00Z",
                "camera": "camera-1",
                "confidence": 0.85,
                "status": "acknowledged",
                "acknowledged_by": "mario.rossi@azienda.com"
            },
            {
                "id": "alert_002",
                "tower_id": tower_id,
                "type": "vehicle_detected",
                "severity": "low",
                "message": "Veicolo rilevato nell'area di parcheggio",
                "timestamp": "2025-01-18T08:30:00Z",
                "camera": "camera-2",
                "confidence": 0.92,
                "status": "resolved",
                "acknowledged_by": "laura.bianchi@azienda.com"
            }
        ]
        
        return jsonify({
            "success": True,
            "alerts": alerts,
            "total": len(alerts)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@super_admin_bp.route('/api/system/stats', methods=['GET'])
def get_system_stats():
    """Get overall system statistics for super admin"""
    try:
        stats = {
            "towers": {
                "total": 1,
                "active": 1,
                "offline": 0,
                "maintenance": 0
            },
            "users": {
                "total": 2,
                "active": 2,
                "operators": 1,
                "supervisors": 1,
                "admins": 1
            },
            "cameras": {
                "total": 2,
                "active": 2,
                "offline": 0
            },
            "alerts": {
                "today": 3,
                "this_week": 12,
                "this_month": 45,
                "active": 0
            },
            "ai_detections": {
                "today": 15,
                "this_week": 89,
                "accuracy": 0.87
            },
            "system_health": {
                "overall_status": "operational",
                "uptime": "99.8%",
                "last_maintenance": "2025-01-15T02:00:00Z"
            }
        }
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
