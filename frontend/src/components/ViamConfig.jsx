import React, { useState, useEffect } from 'react';

const ViamConfig = ({ onConfigSaved, initialConfig = null }) => {
  const [config, setConfig] = useState({
    api_key: '',
    api_key_id: '',
    robot_address: 'sgt01-main.1j0se98dbn.viam.cloud'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
    checkViamStatus();
  }, [initialConfig]);

  const checkViamStatus = async () => {
    try {
      const response = await fetch('/api/viam/status');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Error checking VIAM status:', error);
    }
  };

  const handleConnect = async () => {
    if (!config.api_key || !config.api_key_id) {
      alert('Inserisci API Key e API Key ID');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/viam/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus({ ...result, connected: true });
        if (onConfigSaved) {
          onConfigSaved(config);
        }
        setShowConfig(false);
        alert('Connessione VIAM riuscita!');
      } else {
        alert(`Errore connessione VIAM: ${result.error}`);
      }
    } catch (error) {
      console.error('Error connecting to VIAM:', error);
      alert('Errore durante la connessione');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/viam/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnectionStatus({ connected: false });
        alert('Disconnesso da VIAM');
      }
    } catch (error) {
      console.error('Error disconnecting from VIAM:', error);
    }
  };

  const getStatusColor = () => {
    if (!connectionStatus) return 'text-gray-400';
    return connectionStatus.connected ? 'text-green-400' : 'text-red-400';
  };

  const getStatusText = () => {
    if (!connectionStatus) return 'Sconosciuto';
    return connectionStatus.connected ? 'Connesso' : 'Disconnesso';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-green-400 flex items-center">
          🤖 Configurazione VIAM
        </h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${connectionStatus?.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-sm">{getStatusText()}</span>
        </div>
      </div>

      {/* Status Info */}
      {connectionStatus && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Robot Address:</span>
              <p className="text-white font-mono text-xs">{config.robot_address}</p>
            </div>
            {connectionStatus.connected && (
              <>
                <div>
                  <span className="text-gray-400">Risorse:</span>
                  <p className="text-white">{connectionStatus.resources || 0}</p>
                </div>
                <div>
                  <span className="text-gray-400">Telecamere:</span>
                  <p className="text-white">{connectionStatus.cameras || 0}</p>
                </div>
                <div>
                  <span className="text-gray-400">Servizi Vision:</span>
                  <p className="text-white">{connectionStatus.vision_services || 0}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Configuration Form */}
      {showConfig && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Key</label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({...config, api_key: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
              placeholder="Inserisci la tua API Key VIAM"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Key ID</label>
            <input
              type="text"
              value={config.api_key_id}
              onChange={(e) => setConfig({...config, api_key_id: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
              placeholder="Inserisci il tuo API Key ID VIAM"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Robot Address</label>
            <input
              type="text"
              value={config.robot_address}
              onChange={(e) => setConfig({...config, robot_address: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm"
              placeholder="es. robot-main.xxx.viam.cloud"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {!connectionStatus?.connected ? (
          <>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
            >
              {showConfig ? '📋 Nascondi Config' : '⚙️ Configura'}
            </button>
            
            {showConfig && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded text-white text-sm"
              >
                {isConnecting ? '🔄 Connessione...' : '🔗 Connetti'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={checkViamStatus}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white text-sm"
            >
              🔄 Aggiorna Status
            </button>
            
            <button
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm"
            >
              ⏹️ Disconnetti
            </button>
          </>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg">
        <p className="text-blue-300 text-sm">
          💡 <strong>Come ottenere le credenziali VIAM:</strong>
        </p>
        <ol className="text-blue-200 text-xs mt-2 space-y-1 ml-4">
          <li>1. Vai su <a href="https://app.viam.com" target="_blank" rel="noopener noreferrer" className="underline">app.viam.com</a></li>
          <li>2. Seleziona la tua macchina/robot</li>
          <li>3. Vai su "CONNECT" → "Code sample"</li>
          <li>4. Copia API Key e API Key ID dal codice Python</li>
        </ol>
      </div>
    </div>
  );
};

export default ViamConfig;

