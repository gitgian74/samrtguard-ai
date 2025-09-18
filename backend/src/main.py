import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from src.models.surveillance import db
from src.routes.towers import towers_bp
from src.routes.cameras import cameras_bp
from src.routes.alarms import alarms_bp
from src.routes.dashboard import dashboard_bp
from src.routes.super_admin import super_admin_bp
# from src.routes.viam_routes import viam_bp  # Disabled for deployment
from src.services.appwrite_service import AppwriteService

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'surveillance-platform-secret-key-2024'

# Enable CORS for all routes
CORS(app, origins=['*'])

# Appwrite configuration
app.config['APPWRITE_ENDPOINT'] = 'https://cloud.appwrite.io/v1'
app.config['APPWRITE_PROJECT_ID'] = 'fra-68ca961c0010e0ca62ad'
app.config['APPWRITE_API_KEY'] = 'standard_fbc14edcabe80a6be4b5ad2580ce3226d172c4a06d15c5d9aa7f4c7d9cfc938ce2419efdcc24230b8af946b111df9a82929c5409f8989e8f92f90ad6d8b8f7ab93b50348e75b07325035a57e2712a64193fbb9ac4b70281d5fa816e0ad74cfb4711585a73ad63b28dd6f9e82c8ac2105a5a36b6cf67752f668630b1d9546e4ff'
app.config['APPWRITE_DATABASE_ID'] = '68cbb56a000d6e7c3bb7'

# Initialize Appwrite service
appwrite_service = AppwriteService(app.config)

# Register blueprints
app.register_blueprint(towers_bp, url_prefix='/api/towers')
app.register_blueprint(cameras_bp, url_prefix='/api/cameras')
app.register_blueprint(alarms_bp, url_prefix='/api/alarms')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(super_admin_bp)
# app.register_blueprint(viam_bp, url_prefix='/api/viam')  # Disabled for deployment

# Local SQLite database for caching and offline functionality
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

# Health check endpoint
@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Test Appwrite connection
        appwrite_status = appwrite_service.test_connection()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': '2024-09-18T09:00:00Z',
            'services': {
                'appwrite': 'connected' if appwrite_status else 'disconnected',
                'database': 'connected'
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# API info endpoint
@app.route('/api/info')
def api_info():
    """API information endpoint"""
    return jsonify({
        'name': 'Surveillance Platform API',
        'version': '1.0.0',
        'description': 'Multi-tenant video surveillance system with AI detection',
        'endpoints': {
            'towers': '/api/towers',
            'cameras': '/api/cameras', 
            'alarms': '/api/alarms',
            'dashboard': '/api/dashboard',
            'auth': '/api/auth/status'
        },
        'features': [
            'Multi-tenant architecture',
            'AI-powered detection',
            'Real-time monitoring',
            'Appwrite integration',
            'VIAM edge support',
            'Secure authentication'
        ]
    })

# Authentication status endpoint
@app.route('/api/auth/status')
def auth_status():
    """Check authentication status"""
    return jsonify({
        'success': True,
        'message': 'Authentication handled by frontend Appwrite SDK',
        'appwrite_configured': True,
        'project_id': app.config['APPWRITE_PROJECT_ID'],
        'endpoint': app.config['APPWRITE_ENDPOINT']
    })

# System statistics endpoint
@app.route('/api/system/stats')
def system_stats():
    """Get system statistics for dashboard"""
    try:
        from src.models.surveillance import Tower, Camera, Alarm
        
        # Get basic counts
        towers_total = Tower.query.count()
        towers_online = Tower.query.filter_by(status='online').count()
        cameras_total = Camera.query.count()
        cameras_active = Camera.query.filter_by(status='active').count()
        alarms_total = Alarm.query.count()
        alarms_active = Alarm.query.filter_by(status='new').count()
        
        stats = {
            'towers': {
                'total': towers_total,
                'online': towers_online,
                'offline': towers_total - towers_online
            },
            'cameras': {
                'total': cameras_total,
                'active': cameras_active,
                'inactive': cameras_total - cameras_active
            },
            'alerts': {
                'total': alarms_total,
                'active': alarms_active,
                'resolved': alarms_total - alarms_active
            },
            'system': {
                'status': 'operational' if towers_online > 0 else 'offline',
                'uptime': '99.5%',
                'last_updated': '2024-09-18T13:00:00Z'
            }
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
