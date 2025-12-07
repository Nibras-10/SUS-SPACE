import { serverInstance } from './MockServer';
import { ClientToServerEvents } from '../types';

// This class mimics the client-side socket.io wrapper
class NetworkManager {
  private eventHandlers: Record<string, Function[]> = {};

  constructor() {
    // Connect to the mock server's dispatch
    serverInstance.setClientDispatcher((event, ...args) => {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].forEach(fn => fn(...args));
      }
    });
  }

  public on(event: string, callback: Function) {
    if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
    this.eventHandlers[event].push(callback);
  }

  public off(event: string, callback: Function) {
      if (!this.eventHandlers[event]) return;
      this.eventHandlers[event] = this.eventHandlers[event].filter(fn => fn !== callback);
  }

  public emit<T extends keyof ClientToServerEvents>(event: T, ...args: Parameters<ClientToServerEvents[T]>) {
    // Simulate network delay
    setTimeout(() => {
        serverInstance.handleClientEvent(event, ...args);
    }, 10); // 10ms simulated ping
  }
}

export const net = new NetworkManager();