import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';

export interface NewAppointmentRequestEvent {
  id: number;
  clientName: string;
  patientName: string | null;
  reason: string;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  connect(): void {
    if (this.socket?.connected) return;

    const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, '');
    this.socket = io(`${baseUrl}/notifications`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    this.socket.on('connect', () => console.log('[Socket] conectado'));
    this.socket.on('disconnect', () => console.log('[Socket] desconectado'));

    this.handlers.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket!.on(event, cb));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T>(event: string, callback: (data: T) => void): () => void {
    const cb = callback as (...args: unknown[]) => void;
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
    this.socket?.on(event, cb);
    return () => this.off(event, cb);
  }

  private off(event: string, callback: (...args: unknown[]) => void): void {
    this.handlers.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
