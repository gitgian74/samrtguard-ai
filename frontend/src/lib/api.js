/**
 * API service for surveillance platform
 * Handles all communication with the backend
 */

const API_BASE_URL = '/api'

class SurveillanceAPI {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }
      
      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const searchParams = new URLSearchParams(params)
    const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint
    
    return this.request(url, {
      method: 'GET'
    })
  }

  // POST request
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    })
  }

  // Health check
  async healthCheck() {
    return this.get('/health')
  }

  // Dashboard endpoints
  async getDashboardOverview() {
    return this.get('/dashboard/overview')
  }

  async getDashboardStatistics(days = 7) {
    return this.get('/dashboard/statistics', { days })
  }

  async getDashboardAlerts() {
    return this.get('/dashboard/alerts')
  }

  async getLiveFeed() {
    return this.get('/dashboard/live-feed')
  }

  async exportDashboardData(exportConfig) {
    return this.post('/dashboard/export', exportConfig)
  }

  // Tower endpoints
  async getTowers() {
    return this.get('/towers')
  }

  async getTower(towerId) {
    return this.get(`/towers/${towerId}`)
  }

  async createTower(towerData) {
    return this.post('/towers', towerData)
  }

  async updateTower(towerId, towerData) {
    return this.put(`/towers/${towerId}`, towerData)
  }

  async getTowerStatus(towerId) {
    return this.get(`/towers/${towerId}/status`)
  }

  async sendTowerHeartbeat(towerId) {
    return this.post(`/towers/${towerId}/heartbeat`)
  }

  // Camera endpoints
  async getCameras(towerId = null) {
    const params = towerId ? { tower_id: towerId } : {}
    return this.get('/cameras', params)
  }

  async getCamera(cameraId) {
    return this.get(`/cameras/${cameraId}`)
  }

  async createCamera(cameraData) {
    return this.post('/cameras', cameraData)
  }

  async updateCamera(cameraId, cameraData) {
    return this.put(`/cameras/${cameraId}`, cameraData)
  }

  async updateCameraStatus(cameraId, status) {
    return this.post(`/cameras/${cameraId}/status`, { status })
  }

  async getCameraStream(cameraId) {
    return this.get(`/cameras/${cameraId}/stream`)
  }

  async getCameraSnapshot(cameraId) {
    return this.get(`/cameras/${cameraId}/snapshot`)
  }

  // Alarm endpoints
  async getAlarms(filters = {}) {
    return this.get('/alarms', filters)
  }

  async getAlarm(alarmId) {
    return this.get(`/alarms/${alarmId}`)
  }

  async createAlarm(alarmData) {
    return this.post('/alarms', alarmData)
  }

  async acknowledgeAlarm(alarmId, acknowledgedBy = 'user') {
    return this.post(`/alarms/${alarmId}/acknowledge`, { acknowledged_by: acknowledgedBy })
  }

  async resolveAlarm(alarmId, resolvedBy = 'user') {
    return this.post(`/alarms/${alarmId}/resolve`, { resolved_by: resolvedBy })
  }

  async getAlarmStatistics() {
    return this.get('/alarms/statistics')
  }

  // Utility methods
  formatError(error) {
    if (error.response && error.response.data) {
      return error.response.data.error || 'An error occurred'
    }
    return error.message || 'An unknown error occurred'
  }

  // Real-time connection (WebSocket simulation with polling)
  startRealTimeUpdates(callback, interval = 5000) {
    const pollForUpdates = async () => {
      try {
        const liveFeed = await this.getLiveFeed()
        if (liveFeed.success) {
          callback(liveFeed.data)
        }
      } catch (error) {
        console.error('Real-time update failed:', error)
      }
    }

    // Initial call
    pollForUpdates()

    // Set up polling
    const intervalId = setInterval(pollForUpdates, interval)

    // Return cleanup function
    return () => clearInterval(intervalId)
  }
}

// Create and export API instance
export const surveillanceAPI = new SurveillanceAPI()

// Export class for testing
export { SurveillanceAPI }
