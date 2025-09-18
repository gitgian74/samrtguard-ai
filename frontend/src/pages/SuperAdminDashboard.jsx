import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Super Admin Dashboard Component
function SuperAdminDashboard() {
  const { state: authState } = useAuth()
  const [towers, setTowers] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedTower, setSelectedTower] = useState(null)
  const [showAddTower, setShowAddTower] = useState(false)
  const [showUserAssignment, setShowUserAssignment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Tower form state
  const [towerForm, setTowerForm] = useState({
    name: '',
    code: '',
    description: '',
    location: {
      latitude: '',
      longitude: '',
      address: '',
      zone: ''
    },
    viam_config: {
      machine_address: '',
      api_key: '',
      api_key_id: ''
    },
    cameras: [
      {
        name: 'camera-1',
        type: 'ip_camera',
        resolution: '1920x1080',
        fps: 30
      }
    ],
    ai_settings: {
      confidence_threshold: 0.7,
      detection_classes: ['person', 'vehicle', 'weapon'],
      models: ['yolo', 'effdet']
    },
    notification_settings: {
      email_enabled: true,
      sms_enabled: true,
      escalation_time: 300
    }
  })

  // User assignment state
  const [userAssignment, setUserAssignment] = useState({
    tower_id: '',
    user_email: '',
    role: 'operator',
    permissions: {
      view_live: true,
      receive_alerts: true,
      control_cameras: false
    },
    notifications: {
      email: true,
      sms: false,
      phone: ''
    }
  })

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel
      const [towersResponse, usersResponse, statsResponse] = await Promise.all([
        fetch('/api/towers/list'),
        fetch('/api/users/list'),
        fetch('/api/system/stats')
      ])

      if (towersResponse.ok) {
        const towersData = await towersResponse.json()
        setTowers(towersData.towers || [])
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTower = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/towers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(towerForm)
      })

      if (response.ok) {
        const result = await response.json()
        setTowers([...towers, result.tower])
        setShowAddTower(false)
        setTowerForm({
          name: '',
          code: '',
          description: '',
          location: { latitude: '', longitude: '', address: '', zone: '' },
          viam_config: { machine_address: '', api_key: '', api_key_id: '' },
          cameras: [{ name: 'camera-1', type: 'ip_camera', resolution: '1920x1080', fps: 30 }],
          ai_settings: { confidence_threshold: 0.7, detection_classes: ['person', 'vehicle', 'weapon'], models: ['yolo', 'effdet'] },
          notification_settings: { email_enabled: true, sms_enabled: true, escalation_time: 300 }
        })
        alert('Torre aggiunta con successo!')
        loadAllData() // Reload all data
      } else {
        alert('Errore durante l\'aggiunta della torre')
      }
    } catch (error) {
      console.error('Error adding tower:', error)
      alert('Errore di connessione')
    }
  }

  const handleAssignUser = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/towers/assign-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userAssignment)
      })

      if (response.ok) {
        setShowUserAssignment(false)
        setUserAssignment({
          tower_id: '',
          user_email: '',
          role: 'operator',
          permissions: { view_live: true, receive_alerts: true, control_cameras: false },
          notifications: { email: true, sms: false, phone: '' }
        })
        alert('Utente assegnato con successo!')
        loadAllData() // Reload all data
      } else {
        alert('Errore durante l\'assegnazione utente')
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Errore di connessione')
    }
  }

  const testViamConnection = async (tower) => {
    try {
      const response = await fetch('/api/towers/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          machine_address: tower.viam_config.machine_address,
          api_key: tower.viam_config.api_key,
          api_key_id: tower.viam_config.api_key_id
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`✅ Connessione VIAM riuscita!\n\nRisorse disponibili:\n${result.resources.join('\n')}\n\n${result.simulated ? '(Test simulato - VIAM SDK non disponibile)' : ''}`)
      } else {
        alert(`❌ Connessione VIAM fallita:\n${result.error}`)
      }
    } catch (error) {
      alert(`❌ Errore di connessione: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Caricamento Dashboard Super Admin...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">
            🛡️ Super Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Super Admin: {authState.user?.name}</span>
            <button
              onClick={() => setShowAddTower(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ➕ Aggiungi Torre
            </button>
            <button
              onClick={() => setShowUserAssignment(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              👥 Assegna Utente
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Torri Totali</p>
                <p className="text-3xl font-bold text-blue-400">{stats?.towers?.total || towers.length}</p>
              </div>
              <div className="text-4xl">🗼</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Torri Attive</p>
                <p className="text-3xl font-bold text-green-400">
                  {stats?.towers?.active || towers.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Utenti Assegnati</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.users?.total || users.length}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Allarmi Attivi</p>
                <p className="text-3xl font-bold text-red-400">{stats?.alerts?.active || 0}</p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Towers Management */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">
            🗼 Gestione Torri di Sorveglianza
          </h2>
          
          {towers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🗼</div>
              <p className="text-gray-400 text-lg mb-4">Nessuna torre configurata</p>
              <button
                onClick={() => setShowAddTower(true)}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-md font-medium transition-colors"
              >
                Aggiungi Prima Torre
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {towers.map((tower) => (
                <div key={tower.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{tower.name}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                        tower.status === 'active' 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-red-600 text-red-100'
                      }`}>
                        {tower.status === 'active' ? 'Attiva' : 'Inattiva'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => testViamConnection(tower)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                      >
                        🔗 Test VIAM
                      </button>
                      <button
                        onClick={() => setSelectedTower(tower)}
                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                      >
                        ⚙️ Configura
                      </button>
                    </div>
                  </div>
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Codice:</p>
                      <p className="text-white font-medium">{tower.code}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Posizione:</p>
                      <p className="text-white font-medium">{tower.location?.address || 'Non specificata'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Telecamere:</p>
                      <p className="text-white font-medium">{tower.cameras?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Utenti Assegnati:</p>
                      <p className="text-white font-medium">{tower.assigned_users?.length || 0}</p>
                    </div>
                  </div>

                  {/* VIAM Configuration */}
                  <div className="bg-gray-600 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-green-300 mb-2">🤖 Configurazione VIAM</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400">Machine Address:</p>
                        <p className="text-white font-mono break-all">{tower.viam_config?.machine_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">API Key:</p>
                        <p className="text-white font-mono">{tower.viam_config?.api_key || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">API Key ID:</p>
                        <p className="text-white font-mono">{tower.viam_config?.api_key_id || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Settings */}
                  <div className="bg-gray-600 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2">🧠 Impostazioni AI</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400">Soglia Confidenza:</p>
                        <p className="text-white font-medium">{tower.ai_settings?.confidence_threshold || 0.7}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Modelli:</p>
                        <p className="text-white font-medium">{tower.ai_settings?.models?.join(', ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Classi Rilevamento:</p>
                        <p className="text-white font-medium">{tower.ai_settings?.detection_classes?.join(', ') || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cameras */}
                  {tower.cameras && tower.cameras.length > 0 && (
                    <div className="bg-gray-600 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-yellow-300 mb-2">📹 Telecamere</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {tower.cameras.map((camera, index) => (
                          <div key={index} className="bg-gray-700 rounded p-2">
                            <p className="text-white font-medium">{camera.name}</p>
                            <p className="text-gray-400">{camera.type} - {camera.resolution} @ {camera.fps}fps</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users Management */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">
            👥 Gestione Utenti
          </h2>
          
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-400 text-lg">Nessun utente assegnato alle torri</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4">Utente</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Torri Assegnate</th>
                    <th className="text-left py-3 px-4">Ruolo</th>
                    <th className="text-left py-3 px-4">Notifiche</th>
                    <th className="text-left py-3 px-4">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-gray-300">{user.email}</td>
                      <td className="py-3 px-4">{user.assigned_towers?.length || 0}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'operator' ? 'bg-blue-600 text-white' :
                          user.role === 'supervisor' ? 'bg-purple-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {user.role || 'operator'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-1">
                          {user.notifications?.email && <span className="text-green-400">📧</span>}
                          {user.notifications?.sms && <span className="text-green-400">📱</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          Modifica
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Tower Modal */}
      {showAddTower && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-400">➕ Aggiungi Nuova Torre</h2>
              <button
                onClick={() => setShowAddTower(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddTower} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome Torre</label>
                  <input
                    type="text"
                    value={towerForm.name}
                    onChange={(e) => setTowerForm({...towerForm, name: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Codice Identificativo</label>
                  <input
                    type="text"
                    value={towerForm.code}
                    onChange={(e) => setTowerForm({...towerForm, code: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              {/* VIAM Configuration */}
              <div className="border border-gray-600 rounded p-4">
                <h3 className="text-lg font-semibold mb-4 text-green-400">🔗 Configurazione VIAM</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Indirizzo Macchina VIAM</label>
                    <input
                      type="text"
                      value={towerForm.viam_config.machine_address}
                      onChange={(e) => setTowerForm({
                        ...towerForm, 
                        viam_config: {...towerForm.viam_config, machine_address: e.target.value}
                      })}
                      placeholder="es. sgt01-main.1j0se98dbn.viam.cloud"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">API Key</label>
                      <input
                        type="text"
                        value={towerForm.viam_config.api_key}
                        onChange={(e) => setTowerForm({
                          ...towerForm, 
                          viam_config: {...towerForm.viam_config, api_key: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">API Key ID</label>
                      <input
                        type="text"
                        value={towerForm.viam_config.api_key_id}
                        onChange={(e) => setTowerForm({
                          ...towerForm, 
                          viam_config: {...towerForm.viam_config, api_key_id: e.target.value}
                        })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border border-gray-600 rounded p-4">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">📍 Posizione</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Latitudine</label>
                    <input
                      type="number"
                      step="any"
                      value={towerForm.location.latitude}
                      onChange={(e) => setTowerForm({
                        ...towerForm, 
                        location: {...towerForm.location, latitude: e.target.value}
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Longitudine</label>
                    <input
                      type="number"
                      step="any"
                      value={towerForm.location.longitude}
                      onChange={(e) => setTowerForm({
                        ...towerForm, 
                        location: {...towerForm.location, longitude: e.target.value}
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Indirizzo</label>
                  <input
                    type="text"
                    value={towerForm.location.address}
                    onChange={(e) => setTowerForm({
                      ...towerForm, 
                      location: {...towerForm.location, address: e.target.value}
                    })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* AI Settings */}
              <div className="border border-gray-600 rounded p-4">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">🧠 Impostazioni AI</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Soglia Confidenza</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={towerForm.ai_settings.confidence_threshold}
                      onChange={(e) => setTowerForm({
                        ...towerForm, 
                        ai_settings: {...towerForm.ai_settings, confidence_threshold: parseFloat(e.target.value)}
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Classi di Rilevamento</label>
                    <select
                      multiple
                      value={towerForm.ai_settings.detection_classes}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value)
                        setTowerForm({
                          ...towerForm, 
                          ai_settings: {...towerForm.ai_settings, detection_classes: values}
                        })
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-24"
                    >
                      <option value="person">Persona</option>
                      <option value="vehicle">Veicolo</option>
                      <option value="weapon">Arma</option>
                      <option value="bag">Borsa</option>
                      <option value="animal">Animale</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddTower(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Crea Torre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {showUserAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-400">👥 Assegna Utente a Torre</h2>
              <button
                onClick={() => setShowUserAssignment(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAssignUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Torre</label>
                <select
                  value={userAssignment.tower_id}
                  onChange={(e) => setUserAssignment({...userAssignment, tower_id: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  required
                >
                  <option value="">Seleziona Torre</option>
                  {towers.map(tower => (
                    <option key={tower.id} value={tower.id}>{tower.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email Utente</label>
                <input
                  type="email"
                  value={userAssignment.user_email}
                  onChange={(e) => setUserAssignment({...userAssignment, user_email: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ruolo</label>
                <select
                  value={userAssignment.role}
                  onChange={(e) => setUserAssignment({...userAssignment, role: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="operator">Operatore</option>
                  <option value="supervisor">Supervisore</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUserAssignment(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Assegna Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminDashboard
