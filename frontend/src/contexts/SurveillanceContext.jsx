import { createContext, useContext, useReducer, useEffect } from 'react'
import { surveillanceAPI } from '@/lib/api'

const SurveillanceContext = createContext()

// Initial state
const initialState = {
  // Dashboard data
  overview: {
    towers_count: 0,
    cameras_count: 0,
    active_alarms_count: 0,
    system_status: 'loading'
  },
  
  // Entities
  towers: [],
  cameras: [],
  alarms: [],
  
  // UI state
  loading: {
    overview: false,
    towers: false,
    cameras: false,
    alarms: false
  },
  
  // Errors
  errors: {},
  
  // Real-time updates
  lastUpdate: null,
  connectionStatus: 'disconnected'
}

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_OVERVIEW: 'SET_OVERVIEW',
  SET_TOWERS: 'SET_TOWERS',
  SET_CAMERAS: 'SET_CAMERAS',
  SET_ALARMS: 'SET_ALARMS',
  ADD_ALARM: 'ADD_ALARM',
  UPDATE_ALARM: 'UPDATE_ALARM',
  UPDATE_TOWER: 'UPDATE_TOWER',
  UPDATE_CAMERA: 'UPDATE_CAMERA',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  CLEAR_ERROR: 'CLEAR_ERROR'
}

// Reducer
function surveillanceReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      }
    
    case actionTypes.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        },
        loading: {
          ...state.loading,
          [action.payload.key]: false
        }
      }
    
    case actionTypes.CLEAR_ERROR:
      const newErrors = { ...state.errors }
      delete newErrors[action.payload.key]
      return {
        ...state,
        errors: newErrors
      }
    
    case actionTypes.SET_OVERVIEW:
      return {
        ...state,
        overview: action.payload,
        loading: {
          ...state.loading,
          overview: false
        },
        lastUpdate: new Date().toISOString()
      }
    
    case actionTypes.SET_TOWERS:
      return {
        ...state,
        towers: action.payload,
        loading: {
          ...state.loading,
          towers: false
        }
      }
    
    case actionTypes.SET_CAMERAS:
      return {
        ...state,
        cameras: action.payload,
        loading: {
          ...state.loading,
          cameras: false
        }
      }
    
    case actionTypes.SET_ALARMS:
      return {
        ...state,
        alarms: action.payload,
        loading: {
          ...state.loading,
          alarms: false
        }
      }
    
    case actionTypes.ADD_ALARM:
      return {
        ...state,
        alarms: [action.payload, ...state.alarms],
        overview: {
          ...state.overview,
          active_alarms_count: state.overview.active_alarms_count + 1
        }
      }
    
    case actionTypes.UPDATE_ALARM:
      return {
        ...state,
        alarms: state.alarms.map(alarm =>
          alarm.id === action.payload.id ? { ...alarm, ...action.payload } : alarm
        )
      }
    
    case actionTypes.UPDATE_TOWER:
      return {
        ...state,
        towers: state.towers.map(tower =>
          tower.id === action.payload.id ? { ...tower, ...action.payload } : tower
        )
      }
    
    case actionTypes.UPDATE_CAMERA:
      return {
        ...state,
        cameras: state.cameras.map(camera =>
          camera.id === action.payload.id ? { ...camera, ...action.payload } : camera
        )
      }
    
    case actionTypes.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: action.payload
      }
    
    default:
      return state
  }
}

// Provider component
export function SurveillanceProvider({ children }) {
  const [state, dispatch] = useReducer(surveillanceReducer, initialState)

  // Actions
  const actions = {
    // Loading management
    setLoading: (key, value) => {
      dispatch({ type: actionTypes.SET_LOADING, payload: { key, value } })
    },

    // Error management
    setError: (key, error) => {
      dispatch({ type: actionTypes.SET_ERROR, payload: { key, error } })
    },

    clearError: (key) => {
      dispatch({ type: actionTypes.CLEAR_ERROR, payload: { key } })
    },

    // Data fetching
    fetchOverview: async () => {
      actions.setLoading('overview', true)
      try {
        const response = await surveillanceAPI.getDashboardOverview()
        if (response.success) {
          dispatch({ type: actionTypes.SET_OVERVIEW, payload: response.data })
        } else {
          actions.setError('overview', response.error || 'Failed to fetch overview')
        }
      } catch (error) {
        actions.setError('overview', error.message)
      }
    },

    fetchTowers: async () => {
      actions.setLoading('towers', true)
      try {
        const response = await surveillanceAPI.getTowers()
        if (response.success) {
          dispatch({ type: actionTypes.SET_TOWERS, payload: response.data })
        } else {
          actions.setError('towers', response.error || 'Failed to fetch towers')
        }
      } catch (error) {
        actions.setError('towers', error.message)
      }
    },

    fetchCameras: async (towerId = null) => {
      actions.setLoading('cameras', true)
      try {
        const response = await surveillanceAPI.getCameras(towerId)
        if (response.success) {
          dispatch({ type: actionTypes.SET_CAMERAS, payload: response.data })
        } else {
          actions.setError('cameras', response.error || 'Failed to fetch cameras')
        }
      } catch (error) {
        actions.setError('cameras', error.message)
      }
    },

    fetchAlarms: async (filters = {}) => {
      actions.setLoading('alarms', true)
      try {
        const response = await surveillanceAPI.getAlarms(filters)
        if (response.success) {
          dispatch({ type: actionTypes.SET_ALARMS, payload: response.data })
        } else {
          actions.setError('alarms', response.error || 'Failed to fetch alarms')
        }
      } catch (error) {
        actions.setError('alarms', error.message)
      }
    },

    // Entity operations
    createTower: async (towerData) => {
      try {
        const response = await surveillanceAPI.createTower(towerData)
        if (response.success) {
          await actions.fetchTowers() // Refresh towers list
          return response
        } else {
          throw new Error(response.error || 'Failed to create tower')
        }
      } catch (error) {
        actions.setError('towers', error.message)
        throw error
      }
    },

    updateTower: async (towerId, towerData) => {
      try {
        const response = await surveillanceAPI.updateTower(towerId, towerData)
        if (response.success) {
          dispatch({ type: actionTypes.UPDATE_TOWER, payload: response.data })
          return response
        } else {
          throw new Error(response.error || 'Failed to update tower')
        }
      } catch (error) {
        actions.setError('towers', error.message)
        throw error
      }
    },

    createCamera: async (cameraData) => {
      try {
        const response = await surveillanceAPI.createCamera(cameraData)
        if (response.success) {
          await actions.fetchCameras() // Refresh cameras list
          return response
        } else {
          throw new Error(response.error || 'Failed to create camera')
        }
      } catch (error) {
        actions.setError('cameras', error.message)
        throw error
      }
    },

    acknowledgeAlarm: async (alarmId) => {
      try {
        const response = await surveillanceAPI.acknowledgeAlarm(alarmId)
        if (response.success) {
          dispatch({ 
            type: actionTypes.UPDATE_ALARM, 
            payload: { id: alarmId, status: 'acknowledged' }
          })
          return response
        } else {
          throw new Error(response.error || 'Failed to acknowledge alarm')
        }
      } catch (error) {
        actions.setError('alarms', error.message)
        throw error
      }
    },

    resolveAlarm: async (alarmId) => {
      try {
        const response = await surveillanceAPI.resolveAlarm(alarmId)
        if (response.success) {
          dispatch({ 
            type: actionTypes.UPDATE_ALARM, 
            payload: { id: alarmId, status: 'resolved' }
          })
          return response
        } else {
          throw new Error(response.error || 'Failed to resolve alarm')
        }
      } catch (error) {
        actions.setError('alarms', error.message)
        throw error
      }
    },

    // Real-time updates
    addAlarm: (alarm) => {
      dispatch({ type: actionTypes.ADD_ALARM, payload: alarm })
    },

    setConnectionStatus: (status) => {
      dispatch({ type: actionTypes.SET_CONNECTION_STATUS, payload: status })
    }
  }

  // Auto-refresh data
  useEffect(() => {
    // Initial data load
    actions.fetchOverview()
    actions.fetchTowers()
    actions.fetchCameras()
    actions.fetchAlarms()

    // Set up periodic refresh
    const interval = setInterval(() => {
      actions.fetchOverview()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await surveillanceAPI.healthCheck()
        actions.setConnectionStatus(response.success ? 'connected' : 'disconnected')
      } catch (error) {
        actions.setConnectionStatus('disconnected')
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <SurveillanceContext.Provider value={{ state, actions }}>
      {children}
    </SurveillanceContext.Provider>
  )
}

// Hook to use the surveillance context
export function useSurveillance() {
  const context = useContext(SurveillanceContext)
  if (!context) {
    throw new Error('useSurveillance must be used within a SurveillanceProvider')
  }
  return context
}
