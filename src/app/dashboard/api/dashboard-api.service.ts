import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardMetrics {
  pendingAppointments: number;
  waitingInQueue: number;
  activeEncounters: number;
  finishedEncountersToday: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}dashboard`;

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/metrics`);
  }
}
