import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);

  /** Descarga el PDF como Blob para abrir/descargar en el navegador */
  downloadAppointmentsPdf(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(buildApiUrl('reports/appointments/pdf'), {
      params,
      responseType: 'blob',
    });
  }

  downloadQueuePdf(date: string): Observable<Blob> {
    const params = new HttpParams().set('date', date);
    return this.http.get(buildApiUrl('reports/queue/pdf'), {
      params,
      responseType: 'blob',
    });
  }

  downloadSummaryPdf(from: string, to: string): Observable<Blob> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get(buildApiUrl('reports/summary/pdf'), {
      params,
      responseType: 'blob',
    });
  }
}
