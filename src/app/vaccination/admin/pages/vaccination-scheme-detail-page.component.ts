import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import {
  VaccinationScheme,
  VaccinationSchemeVersion,
  VaccinationSchemeVersionStatus,
} from '../models/vaccination-admin.model';

@Component({
  selector: 'app-vaccination-scheme-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellIconComponent],
  templateUrl: './vaccination-scheme-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemeDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected scheme: VaccinationScheme | null = null;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected isUpdatingStatusId: number | null = null;
  protected pendingStatusVersion: VaccinationSchemeVersion | null = null;
  protected pendingStatus: VaccinationSchemeVersionStatus | null = null;
  protected pendingStatusValidFrom = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!id) {
        void this.router.navigate(['/vaccination/schemes']);
        return;
      }

      void this.loadScheme(id);
    });
  }

  protected canManageSchemes(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected goBack(): void {
    void this.router.navigate(['/vaccination/schemes']);
  }

  protected goToNewVersionPage(): void {
    if (!this.scheme) return;
    void this.router.navigate(['/vaccination/schemes', this.scheme.id, 'versions', 'new']);
  }

  protected openStatusModal(
    version: VaccinationSchemeVersion,
    status: VaccinationSchemeVersionStatus,
  ): void {
    if (
      !this.scheme
      || !this.canManageSchemes()
      || this.isUpdatingStatusId === version.id
      || version.status === status
    ) {
      return;
    }

    this.pendingStatusVersion = version;
    this.pendingStatus = status;
    this.pendingStatusValidFrom = new Date().toISOString().slice(0, 10);
    this.cdr.detectChanges();
  }

  protected closeStatusModal(): void {
    if (this.isUpdatingStatusId !== null) {
      return;
    }

    this.pendingStatusVersion = null;
    this.pendingStatus = null;
    this.pendingStatusValidFrom = new Date().toISOString().slice(0, 10);
    this.cdr.detectChanges();
  }

  protected async confirmStatusUpdate(): Promise<void> {
    if (
      !this.scheme
      || !this.canManageSchemes()
      || !this.pendingStatusVersion
      || !this.pendingStatus
      || this.isUpdatingStatusId === this.pendingStatusVersion.id
    ) {
      return;
    }

    const version = this.pendingStatusVersion;
    const status = this.pendingStatus;
    this.isUpdatingStatusId = version.id;
    this.cdr.detectChanges();

    try {
      await firstValueFrom(
        this.vaccinationApi.updateSchemeVersionStatus(version.id, {
          status,
          validFrom: this.requiresValidFromInput() ? this.pendingStatusValidFrom : undefined,
          changeReason: `Estado actualizado a ${status} desde frontend.`,
        }),
      );
      this.toast.success(`Versión ${version.version} actualizada a ${status}.`);
      this.pendingStatusVersion = null;
      this.pendingStatus = null;
      this.pendingStatusValidFrom = new Date().toISOString().slice(0, 10);
      await this.loadScheme(this.scheme.id);
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo actualizar el estado de la versión.',
        }),
      );
    } finally {
      this.isUpdatingStatusId = null;
      this.cdr.detectChanges();
    }
  }

  protected pendingStatusTitle(): string {
    switch (this.pendingStatus) {
      case 'VIGENTE':
        return 'Marcar como vigente';
      case 'REEMPLAZADO':
        return 'Marcar como reemplazada';
      case 'SUSPENDIDO':
        return 'Suspender versión';
      default:
        return 'Actualizar estado';
    }
  }

  protected pendingStatusDescription(): string {
    switch (this.pendingStatus) {
      case 'VIGENTE':
        return this.pendingStatusVersion?.status === 'REEMPLAZADO'
          ? 'Esta versión volverá a quedar utilizable. El sistema reabrirá su vigencia desde la fecha indicada y moverá la versión vigente actual a REEMPLAZADO de forma automática.'
          : 'Esta versión pasará a ser la utilizable para nuevas asignaciones del esquema. El sistema solo permitirá este cambio si la versión es realmente usable por fecha.';
      case 'REEMPLAZADO':
        return 'Esta versión dejará de usarse para nuevas asignaciones y quedará como referencia histórica. Si más adelante necesitas recuperarla, todavía podrá volver a VIGENTE.';
      case 'SUSPENDIDO':
        return 'Esta versión quedará fuera de uso operativo de forma irreversible. Seguirá existiendo como histórico, pero ya no podrá volver a VIGENTE ni a REEMPLAZADO.';
      default:
        return '';
    }
  }

  protected pendingStatusButtonLabel(): string {
    switch (this.pendingStatus) {
      case 'VIGENTE':
        return 'Confirmar como vigente';
      case 'REEMPLAZADO':
        return 'Confirmar reemplazo';
      case 'SUSPENDIDO':
        return 'Confirmar suspensión';
      default:
        return 'Confirmar';
    }
  }

  protected pendingStatusButtonClasses(): string {
    switch (this.pendingStatus) {
      case 'VIGENTE':
        return 'bg-[#166534] text-white hover:bg-[#14532d]';
      case 'REEMPLAZADO':
        return 'bg-[#1d4ed8] text-white hover:bg-[#1e40af]';
      case 'SUSPENDIDO':
        return 'bg-[#b91c1c] text-white hover:bg-[#991b1b]';
      default:
        return 'bg-primary text-white hover:bg-primary/90';
    }
  }

  protected requiresValidFromInput(): boolean {
    return this.pendingStatus === 'VIGENTE' && this.pendingStatusVersion?.status === 'REEMPLAZADO';
  }

  protected pendingStatusWarning(): string | null {
    switch (this.pendingStatus) {
      case 'SUSPENDIDO':
        return 'Aviso importante: suspender es irreversible. Si confirmas, esta versión no podrá volver a activarse.';
      case 'REEMPLAZADO':
        return 'Si esta acción deja a la especie sin una versión utilizable, el sistema la bloqueará.';
      case 'VIGENTE':
        return this.pendingStatusVersion?.status === 'REEMPLAZADO'
          ? 'Al reactivar esta versión, la vigente actual se cerrará automáticamente el día anterior a la nueva fecha de entrada en vigor.'
          : null;
      default:
        return null;
    }
  }

  protected isStatusActionDisabled(version: VaccinationSchemeVersion, target: VaccinationSchemeVersionStatus): boolean {
    if (this.isUpdatingStatusId === version.id || version.status === target) {
      return true;
    }

    if (version.status === 'SUSPENDIDO') {
      return true;
    }

    return false;
  }

  protected activeVersionLabel(): string {
    if (!this.scheme?.activeVersionId) {
      return 'Sin versión vigente';
    }

    const version = this.scheme.versions.find((item) => item.id === this.scheme?.activeVersionId);
    return version ? `v${version.version}` : 'Sin versión vigente';
  }

  protected formatDate(value: string | null): string {
    return value ? value.slice(0, 10) : 'Sin fecha';
  }

  protected statusClasses(status: VaccinationSchemeVersionStatus): string {
    switch (status) {
      case 'VIGENTE':
        return 'border-[#dcfce7] bg-[#f0fdf4] text-[#166534]';
      case 'REEMPLAZADO':
        return 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]';
      case 'SUSPENDIDO':
        return 'border-[#fee2e2] bg-[#fef2f2] text-[#b91c1c]';
      default:
        return 'border-border bg-[#F8FAFC] text-text-secondary';
    }
  }

  private async loadScheme(id: number): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const scheme = await firstValueFrom(this.vaccinationApi.getScheme(id));
      this.scheme = scheme;
    } catch (error: unknown) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el detalle del esquema.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
