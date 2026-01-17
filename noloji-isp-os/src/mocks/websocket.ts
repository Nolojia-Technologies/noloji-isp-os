// WebSocket mock for real-time events

import { WebSocketEvent, TechnicianLocationEvent, DeviceStatusEvent, AlertEvent } from '@/lib/types';
import { mockTechnicians, mockDevices } from './data';

class WebSocketMock {
  private ws: WebSocket | null = null;
  private intervals: NodeJS.Timeout[] = [];
  private isConnected = false;

  connect(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('WebSocket is only available in the browser'));
        return;
      }

      // Create a mock WebSocket using a real WebSocket to a test server
      // In a real implementation, you would connect to your actual WebSocket server
      // For now, we'll simulate the connection
      this.simulateConnection();

      // Return a mock WebSocket object
      const mockWS = {
        addEventListener: this.addEventListener.bind(this),
        removeEventListener: this.removeEventListener.bind(this),
        close: this.close.bind(this),
        send: this.send.bind(this),
        readyState: 1, // OPEN
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      } as WebSocket;

      this.ws = mockWS;
      resolve(mockWS);
    });
  }

  private simulateConnection() {
    this.isConnected = true;
    console.log('🔶 WebSocket mock connected');

    // Simulate technician location updates every 10 seconds
    const techLocationInterval = setInterval(() => {
      if (!this.isConnected) return;

      const activeTechnicians = mockTechnicians.filter(t =>
        t.currentStatus !== 'off-shift' && t.location
      );

      activeTechnicians.forEach(tech => {
        if (tech.location) {
          // Simulate slight movement
          const lat = tech.location.lat + (Math.random() - 0.5) * 0.001;
          const lng = tech.location.lng + (Math.random() - 0.5) * 0.001;

          const event: TechnicianLocationEvent = {
            type: 'technicianLocation',
            payload: {
              techId: tech.id,
              lat,
              lng,
              timestamp: new Date().toISOString(),
              status: tech.currentStatus,
              jobId: tech.assignedJobs[0]
            }
          };

          this.dispatchEvent('message', { data: JSON.stringify(event) });

          // Update mock data
          tech.location = { lat, lng, timestamp: event.payload.timestamp };
        }
      });
    }, 10000);

    // Simulate device status updates every 30 seconds
    const deviceStatusInterval = setInterval(() => {
      if (!this.isConnected) return;

      // Randomly update a few devices
      const devicesToUpdate = mockDevices
        .filter(() => Math.random() < 0.1) // 10% chance per device
        .slice(0, 5); // Max 5 devices per update

      devicesToUpdate.forEach(device => {
        if (device.metrics) {
          // Simulate metric changes
          device.metrics.cpu = Math.max(0, Math.min(100, device.metrics.cpu + (Math.random() - 0.5) * 10));
          device.metrics.memory = Math.max(0, Math.min(100, device.metrics.memory + (Math.random() - 0.5) * 5));
          device.metrics.trafficRx += Math.floor(Math.random() * 10000);
          device.metrics.trafficTx += Math.floor(Math.random() * 5000);

          // Occasionally simulate device going offline/online
          if (Math.random() < 0.02) {
            device.online = !device.online;
          }

          const event: DeviceStatusEvent = {
            type: 'deviceStatus',
            payload: {
              deviceId: device.id,
              online: device.online,
              metrics: device.metrics,
              timestamp: new Date().toISOString()
            }
          };

          this.dispatchEvent('message', { data: JSON.stringify(event) });
        }
      });
    }, 30000);

    // Simulate random alerts every 2-5 minutes
    const alertInterval = setInterval(() => {
      if (!this.isConnected) return;

      if (Math.random() < 0.3) { // 30% chance every interval
        const alertTypes = ['device_offline', 'payment_failed', 'bandwidth_high'] as const;
        const severities = ['low', 'medium', 'high'] as const;

        const randomDevice = mockDevices[Math.floor(Math.random() * mockDevices.length)];

        const alert: AlertEvent['payload'] = {
          id: `alert_${Date.now()}`,
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          title: `${randomDevice.type} Alert`,
          message: `Automated alert for device ${randomDevice.id}`,
          affectedEntity: {
            type: 'device',
            id: randomDevice.id,
            name: `${randomDevice.model} - ${randomDevice.ip}`
          },
          status: 'active',
          createdAt: new Date().toISOString()
        };

        const event: AlertEvent = {
          type: 'alert',
          payload: alert
        };

        this.dispatchEvent('message', { data: JSON.stringify(event) });
      }
    }, 120000 + Math.random() * 180000); // 2-5 minutes

    this.intervals.push(techLocationInterval, deviceStatusInterval, alertInterval);
  }

  private listeners: { [key: string]: ((event: any) => void)[] } = {};

  private addEventListener(event: string, callback: (event: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private removeEventListener(event: string, callback: (event: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private dispatchEvent(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  private send(data: string) {
    console.log('WebSocket mock sending:', data);
    // In a real implementation, this would send data to the server
  }

  private close() {
    this.isConnected = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('🔶 WebSocket mock disconnected');
  }
}

// Export singleton instance
export const webSocketMock = new WebSocketMock();

// Helper function to connect to WebSocket with mock
export async function connectWebSocket(url: string): Promise<WebSocket> {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MSW_ENABLED === 'true') {
    return webSocketMock.connect(url);
  }

  // In production, connect to real WebSocket
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.onopen = () => resolve(ws);
    ws.onerror = (error) => reject(error);
  });
}