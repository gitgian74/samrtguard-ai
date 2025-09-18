import React, { useState, useEffect, useRef } from 'react';

const ViamVideoPlayer = ({ cameraName, showControls = true, autoConnect = true }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [streamUrl, setStreamUrl] = useState(null);
  const [cameraInfo, setCameraInfo] = useState(null);
  const eventSourceRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (autoConnect) {
      connectToCamera();
    }
    
    return () => {
      disconnect();
    };
  }, [cameraName, autoConnect]);

  const connectToCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, ensure VIAM is connected
      const statusResponse = await fetch('/api/viam/status');
      const statusData = await statusResponse.json();
      
      if (!statusData.connected) {
        // Try to connect with default credentials
        const connectResponse = await fetch('/api/viam/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: 'your-api-key-here', // This should come from config
            api_key_id: 'your-api-key-id-here', // This should come from config
            robot_address: 'sgt01-main.1j0se98dbn.viam.cloud'
          }),
        });
        
        if (!connectResponse.ok) {
          throw new Error('Failed to connect to VIAM robot');
        }
      }

      // Get camera info
      const cameraResponse = await fetch('/api/viam/cameras');
      if (cameraResponse.ok) {
        const cameraData = await cameraResponse.json();
        const camera = cameraData.cameras?.find(c => c.name === cameraName);
        if (camera) {
          setCameraInfo(camera);
          if (camera.stream_url) {
            setStreamUrl(camera.stream_url);
          }
        }
      }

      // Start live feed using Server-Sent Events
      startLiveFeed();
      
      setIsConnected(true);
    } catch (err) {
      setError(err.message);
      console.error('Error connecting to camera:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveFeed = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/viam/cameras/${cameraName}/live-feed`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
        } else {
          setCurrentImage(data.image);
          setDetections(data.detections || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error parsing live feed data:', err);
      }
    };

    eventSource.onerror = (event) => {
      console.error('Live feed error:', event);
      setError('Live feed connection lost');
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConnected(false);
    setCurrentImage(null);
    setDetections([]);
  };

  const captureSnapshot = async () => {
    try {
      const response = await fetch(`/api/viam/cameras/${cameraName}/image`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Create download link
          const link = document.createElement('a');
          link.href = data.image;
          link.download = `${cameraName}_snapshot_${new Date().toISOString()}.jpg`;
          link.click();
        }
      }
    } catch (err) {
      console.error('Error capturing snapshot:', err);
    }
  };

  const getDetections = async () => {
    try {
      const response = await fetch(`/api/viam/cameras/${cameraName}/detections`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDetections(data.detections);
        }
      }
    } catch (err) {
      console.error('Error getting detections:', err);
    }
  };

  const renderDetectionOverlay = () => {
    if (!detections || detections.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {detections.map((detection, index) => (
          <div
            key={index}
            className="absolute border-2 border-red-500 bg-red-500 bg-opacity-20"
            style={{
              left: `${detection.x_min * 100}%`,
              top: `${detection.y_min * 100}%`,
              width: `${(detection.x_max - detection.x_min) * 100}%`,
              height: `${(detection.y_max - detection.y_min) * 100}%`,
            }}
          >
            <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-1 rounded">
              {detection.class_name} ({Math.round(detection.confidence * 100)}%)
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-white">{cameraName}</h4>
        <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`}></div>
          <span className="text-sm">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Video Display */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {isLoading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={connectToCamera}
                className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-xs"
              >
                Riconnetti
              </button>
            </div>
          </div>
        )}

        {currentImage && !isLoading && !error && (
          <>
            <img
              src={currentImage}
              alt={`${cameraName} live feed`}
              className="w-full h-full object-cover"
            />
            {renderDetectionOverlay()}
            
            {/* Overlay info */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
              <span className="text-white text-xs">{cameraName}</span>
            </div>
            
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
              <span className="text-green-400 text-xs">● VIAM</span>
            </div>
            
            {/* Detection count */}
            {detections.length > 0 && (
              <div className="absolute top-2 right-2 bg-red-500 bg-opacity-80 rounded px-2 py-1">
                <span className="text-white text-xs">🚨 {detections.length} oggetti</span>
              </div>
            )}
          </>
        )}

        {!currentImage && !isLoading && !error && isConnected && (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl">📹</span>
              </div>
              <p className="text-gray-400 text-sm">Caricamento stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="mt-3 flex justify-between items-center text-sm">
          <div className="text-gray-400">
            {cameraInfo && (
              <span>{cameraInfo.type} - {cameraInfo.resolution || '1920x1080'}</span>
            )}
          </div>
          <div className="flex space-x-2">
            {!isConnected ? (
              <button
                onClick={connectToCamera}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded text-white text-xs"
              >
                {isLoading ? 'Connessione...' : '🔗 Connetti'}
              </button>
            ) : (
              <>
                <button
                  onClick={captureSnapshot}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-xs"
                >
                  📷 Snapshot
                </button>
                <button
                  onClick={getDetections}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white text-xs"
                >
                  🔍 Rileva
                </button>
                <button
                  onClick={disconnect}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-xs"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stream URL info */}
      {streamUrl && (
        <div className="mt-2 text-xs text-gray-500">
          Stream: {streamUrl}
        </div>
      )}
    </div>
  );
};

export default ViamVideoPlayer;

