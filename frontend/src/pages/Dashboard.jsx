import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ViamVideoPlayer from '@/components/ViamVideoPlayer';
import ViamConfig from '@/components/ViamConfig';

const Dashboard = () => {
  const { state: authState } = useAuth();
  const [towers, setTowers] = useState([]);
  const [selectedTower, setSelectedTower] = useState(null);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    assignedTowers: 0,
    activeCameras: 0,
    activeAlarms: 0
  });

  // Connection quality simulation
  const [connectionQuality, setConnectionQuality] = useState({
    signal: 'Excellent',
    strength: 95,
    latency: 12,
    bandwidth: 850,
    packetLoss: 0.1
  });

  // New tower configuration state
  const [newTower, setNewTower] = useState({
    name: '',
    code: '',
    location: {
      address: '',
      latitude: '',
      longitude: ''
    },
    viam_config: {
      machine_address: '',
      api_key: '',
      api_key_id: ''
    },
    cameras: [
      { name: 'camera-1', type: 'ip_camera', resolution: '1920x1080', fps: 30 }
    ],
    ai_settings: {
      confidence_threshold: 0.7,
      detection_classes: ['person', 'vehicle', 'weapon'],
      models: ['yolo', 'effdet']
    }
  });

  useEffect(() => {
    loadDashboardData();
    // Simulate connection quality updates
    const interval = setInterval(updateConnectionQuality, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateConnectionQuality = () => {
    setConnectionQuality(prev => ({
      signal: Math.random() > 0.1 ? 'Excellent' : Math.random() > 0.05 ? 'Good' : 'Fair',
      strength: 85 + Math.floor(Math.random() * 15),
      latency: 8 + Math.floor(Math.random() * 10),
      bandwidth: 800 + Math.floor(Math.random() * 200),
      packetLoss: Math.random() * 0.5
    }));
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load towers - use correct endpoint
      const towersResponse = await fetch('/api/towers/list');
      if (towersResponse.ok) {
        const towersData = await towersResponse.json();
        if (towersData.success) {
          setTowers(towersData.data || []);
        }
      }

      // Load stats - use correct endpoint
      const statsResponse = await fetch('/api/system/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats({
            assignedTowers: statsData.stats?.towers?.total || 0,
            activeCameras: statsData.stats?.cameras?.active || 0,
            activeAlarms: statsData.stats?.alerts?.active || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTowerClick = (tower) => {
    setSelectedTower(tower);
  };

  const handleBackToList = () => {
    setSelectedTower(null);
  };

  const handleConfigureTower = () => {
    setShowConfigureModal(true);
  };

  const handleSaveTower = async () => {
    try {
      const response = await fetch('/api/towers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTower),
      });

      if (response.ok) {
        alert('Torre configurata con successo!');
        setShowConfigureModal(false);
        loadDashboardData();
        // Reset form
        setNewTower({
          name: '',
          code: '',
          location: { address: '', latitude: '', longitude: '' },
          viam_config: { machine_address: '', api_key: '', api_key_id: '' },
          cameras: [{ name: 'camera-1', type: 'ip_camera', resolution: '1920x1080', fps: 30 }],
          ai_settings: { confidence_threshold: 0.7, detection_classes: ['person', 'vehicle', 'weapon'], models: ['yolo', 'effdet'] }
        });
      } else {
        alert('Errore durante la configurazione della torre');
      }
    } catch (error) {
      console.error('Error saving tower:', error);
      alert('Errore durante il salvataggio');
    }
  };

  const testViamConnection = async (tower) => {
    try {
      const response = await fetch('/api/towers/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          machine_address: tower.viam_config.machine_address,
          api_key: tower.viam_config.api_key,
          api_key_id: tower.viam_config.api_key_id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Test VIAM: ${result.success ? 'Connessione riuscita!' : 'Connessione fallita'}`);
      }
    } catch (error) {
      console.error('Error testing VIAM connection:', error);
      alert('Errore durante il test di connessione');
    }
  };

  // Connection Quality Card Component
  const ConnectionQualityCard = () => {
    const getSignalColor = (strength) => {
      if (strength >= 90) return 'text-green-400';
      if (strength >= 70) return 'text-yellow-400';
      return 'text-red-400';
    };

    const getSignalBars = (strength) => {
      const bars = Math.ceil(strength / 20);
      return Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-1 bg-gray-600 rounded-sm ${
            i < bars ? getSignalColor(strength).replace('text-', 'bg-') : ''
          }`}
          style={{ height: `${(i + 1) * 4 + 8}px` }}
        ></div>
      ));
    };

    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            📡 Qualità Connessione
          </h3>
          <div className="flex space-x-1">
            {getSignalBars(connectionQuality.strength)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getSignalColor(connectionQuality.strength)}`}>
              {connectionQuality.strength}%
            </div>
            <div className="text-gray-400 text-sm">Forza Segnale</div>
            <div className={`text-xs ${getSignalColor(connectionQuality.strength)}`}>
              {connectionQuality.signal}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {connectionQuality.latency}ms
            </div>
            <div className="text-gray-400 text-sm">Latenza</div>
            <div className="text-xs text-blue-400">
              {connectionQuality.latency < 20 ? 'Ottima' : connectionQuality.latency < 50 ? 'Buona' : 'Accettabile'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {connectionQuality.bandwidth}
            </div>
            <div className="text-gray-400 text-sm">Mbps</div>
            <div className="text-xs text-purple-400">Banda</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {connectionQuality.packetLoss.toFixed(1)}%
            </div>
            <div className="text-gray-400 text-sm">Packet Loss</div>
            <div className="text-xs text-green-400">
              {connectionQuality.packetLoss < 1 ? 'Ottimo' : 'Accettabile'}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Ultimo aggiornamento:</span>
            <span className="text-white">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  // Tower Detail View
  if (selectedTower) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToList}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>←</span>
                <span>Torna alla Lista</span>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🗼</span>
                <h1 className="text-2xl font-bold">{selectedTower.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                selectedTower.status === 'active' 
                  ? 'bg-green-600 text-green-100' 
                  : 'bg-red-600 text-red-100'
              }`}>
                {selectedTower.status === 'active' ? 'Attiva' : 'Offline'}
              </span>
              <button
                onClick={() => testViamConnection(selectedTower)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                🔗 Test VIAM
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Codice Torre</p>
                  <p className="text-2xl font-bold text-blue-400">{selectedTower.code}</p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Telecamere</p>
                  <p className="text-2xl font-bold text-green-400">{selectedTower.cameras?.length || 0}</p>
                </div>
                <div className="text-3xl">📹</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Utenti Assegnati</p>
                  <p className="text-2xl font-bold text-purple-400">{selectedTower.assigned_users?.length || 0}</p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Allarmi Oggi</p>
                  <p className="text-2xl font-bold text-red-400">0</p>
                </div>
                <div className="text-3xl">🚨</div>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Configuration & Position */}
            <div className="space-y-6">
              {/* VIAM Configuration */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                  🤖 Configurazione VIAM
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Machine Address</span>
                    <p className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                      {selectedTower.viam_config?.machine_address}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-400 text-sm">API Key</span>
                      <p className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                        ***hidden***
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">API Key ID</span>
                      <p className="text-white font-mono text-sm bg-gray-700 p-2 rounded">
                        ***hidden***
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                  📍 Informazioni Posizione
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Indirizzo</span>
                    <p className="text-white">{selectedTower.location?.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-400 text-sm">Latitudine</span>
                      <p className="text-white">{selectedTower.location?.latitude}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Longitudine</span>
                      <p className="text-white">{selectedTower.location?.longitude}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Zona</span>
                    <p className="text-white">{selectedTower.location?.zone || 'Centro Storico'}</p>
                  </div>
                </div>
              </div>

              {/* AI Settings */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-pink-400 mb-4 flex items-center">
                  🧠 Impostazioni AI
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Soglia Confidenza</span>
                    <p className="text-white">{selectedTower.ai_settings?.confidence_threshold}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Modelli</span>
                    <p className="text-white">{selectedTower.ai_settings?.models?.join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Classi di Rilevamento</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTower.ai_settings?.detection_classes?.map((cls, index) => (
                        <span key={index} className="bg-purple-600 text-purple-100 px-2 py-1 rounded text-xs">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connection Quality */}
              <ConnectionQualityCard />
            </div>

            {/* Right Column - Live Video Feeds */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-yellow-400 mb-6 flex items-center">
                  📹 Feed Video Live
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {selectedTower.cameras?.map((camera, index) => (
                    <ViamVideoPlayer 
                      key={index} 
                      cameraName={camera.name || `camera-${index + 1}`}
                      showControls={true}
                      autoConnect={true}
                    />
                  ))}
                  
                  {/* Default VIAM cameras if no cameras configured */}
                  {(!selectedTower.cameras || selectedTower.cameras.length === 0) && (
                    <>
                      <ViamVideoPlayer 
                        cameraName="camera-1"
                        showControls={true}
                        autoConnect={true}
                      />
                      <ViamVideoPlayer 
                        cameraName="camera-2"
                        showControls={true}
                        autoConnect={true}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main Dashboard View (Tower List)
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">
            🛡️ Surveillance Platform
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {authState.user?.name}</span>
            <button
              onClick={handleConfigureTower}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
            >
              ⚙️ Configura Nuova Torre
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Torri Assegnate</p>
                <p className="text-3xl font-bold text-blue-400">{stats.assignedTowers}</p>
              </div>
              <div className="text-4xl">🗼</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Telecamere Attive</p>
                <p className="text-3xl font-bold text-green-400">{stats.activeCameras}</p>
              </div>
              <div className="text-4xl">📹</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Allarmi Attivi</p>
                <p className="text-3xl font-bold text-red-400">{stats.activeAlarms}</p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </div>
        </div>

        {/* VIAM Configuration Section */}
        <div className="mb-8">
          <ViamConfig onConfigSaved={(config) => console.log('VIAM config saved:', config)} />
        </div>

        {/* Towers List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-blue-400 flex items-center">
            🗼 Torri Attive
          </h2>
          
          {towers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏗️</div>
              <p className="text-gray-400 text-lg">Nessuna torre configurata</p>
              <p className="text-gray-500 text-sm">Clicca su "Configura Nuova Torre" per iniziare</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {towers.map((tower, index) => (
                <div
                  key={index}
                  onClick={() => handleTowerClick(tower)}
                  className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{tower.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      tower.status === 'active' 
                        ? 'bg-green-600 text-green-100' 
                        : 'bg-red-600 text-red-100'
                    }`}>
                      {tower.status === 'active' ? 'Attiva' : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Codice:</span>
                      <span className="text-white">{tower.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Posizione:</span>
                      <span className="text-white truncate ml-2">{tower.location?.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Telecamere:</span>
                      <span className="text-green-400">{tower.cameras?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utenti Assegnati:</span>
                      <span className="text-purple-400">{tower.assigned_users?.length || 0}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Clicca per dettagli</span>
                      <span className="text-blue-400">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Configure Tower Modal */}
      {showConfigureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">⚙️ Configura Nuova Torre</h2>
              <button
                onClick={() => setShowConfigureModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">Informazioni Base</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Nome Torre</label>
                    <input
                      type="text"
                      value={newTower.name}
                      onChange={(e) => setNewTower({...newTower, name: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      placeholder="es. Torre Nord"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Codice Identificativo</label>
                    <input
                      type="text"
                      value={newTower.code}
                      onChange={(e) => setNewTower({...newTower, code: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      placeholder="es. TN001"
                    />
                  </div>
                </div>
              </div>

              {/* VIAM Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Configurazione VIAM</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Indirizzo Macchina VIAM</label>
                    <input
                      type="text"
                      value={newTower.viam_config.machine_address}
                      onChange={(e) => setNewTower({
                        ...newTower, 
                        viam_config: {...newTower.viam_config, machine_address: e.target.value}
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      placeholder="es. tower01-main.1j0se98dbn.viam.cloud"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">API Key</label>
                      <input
                        type="password"
                        value={newTower.viam_config.api_key}
                        onChange={(e) => setNewTower({
                          ...newTower, 
                          viam_config: {...newTower.viam_config, api_key: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="API Key VIAM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">API Key ID</label>
                      <input
                        type="text"
                        value={newTower.viam_config.api_key_id}
                        onChange={(e) => setNewTower({
                          ...newTower, 
                          viam_config: {...newTower.viam_config, api_key_id: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="API Key ID"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-3">Posizione</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Indirizzo</label>
                    <input
                      type="text"
                      value={newTower.location.address}
                      onChange={(e) => setNewTower({
                        ...newTower, 
                        location: {...newTower.location, address: e.target.value}
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      placeholder="es. Via Roma 123, Milano"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Latitudine</label>
                      <input
                        type="number"
                        step="any"
                        value={newTower.location.latitude}
                        onChange={(e) => setNewTower({
                          ...newTower, 
                          location: {...newTower.location, latitude: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="45.4642"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Longitudine</label>
                      <input
                        type="number"
                        step="any"
                        value={newTower.location.longitude}
                        onChange={(e) => setNewTower({
                          ...newTower, 
                          location: {...newTower.location, longitude: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="9.19"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Settings */}
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-3">Impostazioni AI</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Soglia Confidenza</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newTower.ai_settings.confidence_threshold}
                    onChange={(e) => setNewTower({
                      ...newTower, 
                      ai_settings: {...newTower.ai_settings, confidence_threshold: parseFloat(e.target.value)}
                    })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setShowConfigureModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveTower}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                Salva Torre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
