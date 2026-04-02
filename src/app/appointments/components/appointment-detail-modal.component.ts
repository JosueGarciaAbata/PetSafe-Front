import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppointmentsApiService } from '../api/appointments-api.service';
import { AppointmentRecord, buildAppointmentReasonLabel, buildAppointmentStatusLabel } from '../models/appointment.model';

@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-detail-modal.component.html',
  styleUrl: './appointment-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentDetailModalComponent {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) appointment!: AppointmentRecord;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly updated = new EventEmitter<void>();

  protected isSaving = false;
  protected submitError: string | null = null;

  protected close(): void {
    if (this.isSaving) return;
    this.closed.emit();
  }

  protected get canConfirm(): boolean {
    return this.appointment.status === 'PROGRAMADA';
  }

  protected get canCancel(): boolean {
    return !['FINALIZADA', 'CANCELADA', 'EN_PROCESO'].includes(this.appointment.status);
  }

  protected buildReasonLabel(reason: string | null): string {
    return buildAppointmentReasonLabel(reason);
  }

  protected buildStatusLabel(status: string): string {
    return buildAppointmentStatusLabel(status as any);
  }

  protected get initals(): string {
    const name = this.appointment.patientName?.trim() || '';
    if (!name) return `P${String(this.appointment.patientId).slice(-1)}`;
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase() || `P${String(this.appointment.patientId).slice(-1)}`;
  }

  protected async confirmAppointment(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.confirm(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo confirmar la cita.',
      });
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async cancelAppointment(): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.cancel(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cancelar la cita.',
      });
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}
