import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardApiService, DashboardMetrics } from './api/dashboard-api.service';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  protected metrics: DashboardMetrics | null = null;
  protected isLoading = true;
  protected loadError: string | null = null;
  protected readonly todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  ngOnInit() {
    this.loadMetrics();
  }

    protected async loadMetrics() {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();
    
    try {
      this.metrics = await firstValueFrom(this.dashboardApi.getMetrics());
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      this.loadError = 'No se pudieron cargar las métricas del día';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
