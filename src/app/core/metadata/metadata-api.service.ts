import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MetadataApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}metadata/enums`;

  getEnums(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(this.baseUrl);
  }
}
