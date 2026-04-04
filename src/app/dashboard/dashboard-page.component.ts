import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardApiService, DashboardMetrics } from './api/dashboard-api.service';

type DashboardMetricKey = keyof DashboardMetrics;
type DashboardKpiCard = {
  key: DashboardMetricKey;
  label: string;
  description: string;
  accentClass: string;
  badgeClass: string;
  icon: 'appointments' | 'queue' | 'encounters' | 'completed';
};

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
  protected readonly kpiCards: DashboardKpiCard[] = [
    {
      key: 'pendingAppointments',
      label: 'Citas de hoy',
      description: 'Turnos pendientes por atender o confirmar.',
      accentClass: 'text-[#365E9D]',
      badgeClass: 'bg-[#EEF2FF] text-[#365E9D]',
      icon: 'appointments',
    },
    {
      key: 'waitingInQueue',
      label: 'En cola',
      description: 'Pacientes esperando para ingresar a consulta.',
      accentClass: 'text-[#9A6700]',
      badgeClass: 'bg-[#FFF4DB] text-[#9A6700]',
      icon: 'queue',
    },
    {
      key: 'activeEncounters',
      label: 'En consulta',
      description: 'Atenciones activas en curso en este momento.',
      accentClass: 'text-brand',
      badgeClass: 'bg-active-soft text-brand',
      icon: 'encounters',
    },
    {
      key: 'finishedEncountersToday',
      label: 'Finalizados',
      description: 'Atenciones completadas durante la jornada.',
      accentClass: 'text-[#2F7A4E]',
      badgeClass: 'bg-[#ECFDF3] text-[#2F7A4E]',
      icon: 'completed',
    },
  ];
  protected readonly todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  ngOnInit(): void {
    void this.loadMetrics();
  }

  protected async loadMetrics(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      this.metrics = await firstValueFrom(this.dashboardApi.getMetrics());
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      this.loadError = 'No se pudieron cargar las metricas del dia';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  protected getMetricValue(key: DashboardMetricKey): number {
    return this.metrics?.[key] ?? 0;
  }
}
