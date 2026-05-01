import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NotificationsApiService } from './notifications-api.service';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { AppointmentRequestNotification, AppointmentRequestStatus, STATUS_LABELS, STATUS_COLORS } from './notification.model';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(NotificationsApiService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected requests: AppointmentRequestNotification[] = [];
  protected isLoading = true;
  protected loadError: string | null = null;
  protected selectedRequest: AppointmentRequestNotification | null = null;
  protected staffNotes = '';
  protected isSaving = false;
  protected filterStatus: string = 'TODOS';
  protected conflictError: string | null = null;
  protected rescheduleDate = '';
  protected rescheduleTime = '';
  protected isCheckingAvailability = false;
  protected hasConflict = false;

  readonly statusLabels = STATUS_LABELS;
  readonly statusColors = STATUS_COLORS;
  readonly filters = ['TODOS', 'PENDIENTE', 'CONFIRMADA', 'RECHAZADA'];

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {}

  protected get visibleRequests(): AppointmentRequestNotification[] {
    if (this.filterStatus === 'TODOS') return this.requests;
    return this.requests.filter((r) => r.status === this.filterStatus);
  }

  protected get pendingCount(): number {
    return this.requests.filter((r) => r.status === 'PENDIENTE').length;
  }

  protected getStatusLabel(f: string): string {
    return this.statusLabels[f as AppointmentRequestStatus];
  }

  protected clientName(r: AppointmentRequestNotification): string {
    const p = r.clientUser?.person;
    if (p) return `${p.firstName} ${p.lastName}`.trim();
    return r.clientUser?.email ?? 'Cliente';
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return 'Sin fecha preferida';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  protected formatDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected openDetail(request: AppointmentRequestNotification): void {
    this.selectedRequest = request;
    this.staffNotes = '';
    this.conflictError = null;
    this.hasConflict = false;
    this.rescheduleDate = request.preferredDate ?? '';
    this.rescheduleTime = request.preferredTime ? request.preferredTime.substring(0, 5) : '';
    if (this.rescheduleDate && this.rescheduleTime) {
      void this.checkAvailability();
    }
    this.cdr.markForCheck();
  }

  protected closeDetail(): void {
    this.selectedRequest = null;
    this.conflictError = null;
    this.hasConflict = false;
    this.cdr.markForCheck();
  }

  protected onDateTimeChange(): void {
    if (this.rescheduleDate && this.rescheduleTime) {
      void this.checkAvailability();
    }
  }

  private async checkAvailability(): Promise<void> {
    this.isCheckingAvailability = true;
    this.cdr.markForCheck();
    try {
      const result = await firstValueFrom(
        this.api.checkAvailability(this.rescheduleDate, this.rescheduleTime),
      );
      this.hasConflict = !result.available;
      this.conflictError = result.available ? null : (result.message ?? 'Conflicto de horario.');
    } catch {
      this.hasConflict = false;
      this.conflictError = null;
    } finally {
      this.isCheckingAvailability = false;
      this.cdr.markForCheck();
    }
  }

  protected async confirm(): Promise<void> {
    if (!this.selectedRequest) return;
    await this.updateStatus(this.selectedRequest.id, 'CONFIRMADA');
  }

  protected async reject(): Promise<void> {
    if (!this.selectedRequest) return;
    await this.updateStatus(this.selectedRequest.id, 'RECHAZADA');
  }

  private async updateStatus(id: number, status: 'CONFIRMADA' | 'RECHAZADA'): Promise<void> {
    this.isSaving = true;
    this.conflictError = null;
    this.cdr.markForCheck();
    try {
      const updated = await firstValueFrom(
        this.api.updateRequestStatus(
          id, status,
          this.staffNotes || undefined,
          status === 'CONFIRMADA' ? (this.rescheduleDate || undefined) : undefined,
          status === 'CONFIRMADA' ? (this.rescheduleTime || undefined) : undefined,
        ),
      );
      const idx = this.requests.findIndex((r) => r.id === id);
      if (idx >= 0) this.requests[idx] = updated;
      this.selectedRequest = null;
      this.toast.success(`Solicitud ${status === 'CONFIRMADA' ? 'confirmada y cita agendada' : 'rechazada'} correctamente.`);
    } catch (err: any) {
      const httpStatus = err?.status ?? err?.error?.statusCode;
      if (httpStatus === 409) {
        this.hasConflict = true;
        this.conflictError = err?.error?.message ?? 'Conflicto de horario. Elige otra fecha u hora.';
      } else {
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : (err?.error?.message ?? 'No se pudo actualizar la solicitud.');
        this.toast.error(msg);
      }
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();
    try {
      this.requests = await firstValueFrom(this.api.listAppointmentRequests());
    } catch {
      this.loadError = 'No se pudieron cargar las solicitudes.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
