import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  owners: 'Propietarios',
  pets: 'Mascotas',
  appointments: 'Citas',
  history: 'Historial medico',
  treatments: 'Vacunas y tratamientos',
  adoption: 'Adopcion',
  reports: 'Reportes',
  settings: 'Configuracion',
};

@Component({
  selector: 'app-internal-section-page',
  standalone: true,
  templateUrl: './internal-section-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalSectionPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly routePath = this.route.snapshot.routeConfig?.path ?? '';
  protected readonly sectionLabel = SECTION_LABELS[this.routePath] ?? 'Seccion interna';
}
