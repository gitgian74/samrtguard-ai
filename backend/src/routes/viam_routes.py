"""
VIAM API routes
Handles VIAM robot integration, camera streaming, and ML services
"""

from flask import Blueprint, jsonify, request, Response
from src.services.viam_service import get_viam_service, initialize_viam_service
import asyncio
import json
import logging

logger = logging.getLogger(__name__)
viam_bp = Blueprint('viam', __name__)

@viam_bp.route('/connect', methods=['POST'])
def connect_viam():
    """Connect to VIAM robot"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        api_key = data.get('api_key')
        api_key_id = data.get('api_key_id')
        robot_address = data.get('robot_address', 'sgt01-main.1j0se98dbn.viam.cloud')
        
        if not api_key or not api_key_id:
            return jsonify({
                'success': False,
                'error': 'API key and API key ID are required'
            }), 400
        
        # Initialize VIAM service
        viam_service = initialize_viam_service(api_key, api_key_id, robot_address)
        
        # Connect asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(viam_service.connect())
        loop.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Connected to VIAM robot successfully',
                'robot_address': robot_address
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to VIAM robot'
            }), 500
            
    except Exception as e:
        logger.error(f"Error connecting to VIAM: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/status', methods=['GET'])
def viam_status():
    """Get VIAM connection status"""
    try:
        viam_service = get_viam_service()
        
        if not viam_service:
            return jsonify({
                'success': True,
                'connected': False,
                'message': 'VIAM service not initialized'
            })
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        status = loop.run_until_complete(viam_service.test_connection())
        loop.close()
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting VIAM status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/cameras', methods=['GET'])
def get_cameras():
    """Get list of available cameras"""
    try:
        viam_service = get_viam_service()
        
        if not viam_service or not viam_service.connected:
            return jsonify({
                'success': False,
                'error': 'VIAM service not connected'
            }), 503
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        cameras = loop.run_until_complete(viam_service.get_camera_list())
        loop.close()
        
        return jsonify({
            'success': True,
            'cameras': cameras
        })
        
    except Exception as e:
        logger.error(f"Error getting cameras: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/cameras/<camera_name>/image', methods=['GET'])
def get_camera_image(camera_name):
    """Get current image from camera"""
    try:
        viam_service = get_viam_service()
        
        if not viam_service or not viam_service.connected:
            return jsonify({
                'success': False,
                'error': 'VIAM service not connected'
            }), 503
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        image_data = loop.run_until_complete(viam_service.get_camera_image(camera_name))
        loop.close()
        
        if image_data:
            return jsonify({
                'success': True,
                'image': image_data,
                'camera': camera_name
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to get image from camera {camera_name}'
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting camera image: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/cameras/<camera_name>/stream', methods=['GET'])
def get_camera_stream(camera_name):
    """Get camera stream URL"""
    try:
        viam_service = get_viam_service()
        
        if not viam_service or not viam_service.connected:
            return jsonify({
                'success': False,
                'error': 'VIAM service not connected'
            }), 503
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stream_url = loop.run_until_complete(viam_service.get_camera_stream_url(camera_name))
        loop.close()
        
        if stream_url:
            return jsonify({
                'success': True,
                'stream_url': stream_url,
                'camera': camera_name,
                'type': 'rtsp'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'No stream available for camera {camera_name}'
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting camera stream: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/cameras/<camera_name>/detections', methods=['GET'])
def get_camera_detections(camera_name):
    """Get object detection results from camera"""
    try:
        viam_service = get_viam_service()
        
        if not viam_service or not viam_service.connected:
            return jsonify({
                'success': False,
                'error': 'VIAM service not connected'
            }), 503
        
        vision_service = request.args.get('vision_service', 'vision-effdet')
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        detections = loop.run_until_complete(
            viam_service.get_detection_results(camera_name, vision_service)
        )
        loop.close()
        
        if detections is not None:
            return jsonify({
                'success': True,
                'detections': detections,
                'camera': camera_name,
                'vision_service': vision_service
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to get detections from camera {camera_name}'
            }), 404
            
    except Exception as e:
        logger.error(f"Error getting camera detections: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@viam_bp.route('/cameras/<camera_name>/live-feed', methods=['GET'])
def camera_live_feed(camera_name):
    """Server-sent events endpoint for live camera feed"""
    def generate():
        try:
            viam_service = get_viam_service()
            
            if not viam_service or not viam_service.connected:
                yield f"data: {json.dumps({'error': 'VIAM service not connected'})}\n\n"
                return
            
            while True:
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    # Get image
                    image_data = loop.run_until_complete(viam_service.get_camera_image(camera_name))
                    
                    # Get detections
                    detections = loop.run_until_complete(
                        viam_service.get_detection_results(camera_name, 'vision-effdet')
                    )
                    
                    loop.close()
                    
                    if image_data:
                        data = {
                            'image': image_data,
                            'detections': detections or [],
                            'timestamp': '2024-09-18T13:00:00Z',
                            'camera': camera_name
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                    
                    # Wait before next frame (adjust for desired FPS)
                    import time
                    time.sleep(1.0)  # 1 FPS for now
                    
                except Exception as e:
                    logger.error(f"Error in live feed: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    break
                    
        except Exception as e:
            logger.error(f"Error starting live feed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@viam_bp.route('/disconnect', methods=['POST'])
def disconnect_viam():
    """Disconnect from VIAM robot"""
    try:
        viam_service = get_viam_service()
        
        if viam_service:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(viam_service.disconnect())
            loop.close()
        
        return jsonify({
            'success': True,
            'message': 'Disconnected from VIAM robot'
        })
        
    except Exception as e:
        logger.error(f"Error disconnecting from VIAM: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

