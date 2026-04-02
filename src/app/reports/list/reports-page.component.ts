import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReportsApiService } from '../api/reports-api.service';

type ReportType = 'appointments' | 'queue' | 'summary';

interface ReportCard {
  type: ReportType;
  icon: string;
  title: string;
  description: string;
  color: string;
  needsRange: boolean;   // true = from+to, false = date (un día)
}

const REPORT_CARDS: ReportCard[] = [
  {
    type: 'appointments',
    icon: '📅',
    title: 'Agenda de Citas',
    description:
      'Listado completo de citas por período: paciente, tutor, veterinario, motivo y estado.',
    color: 'teal',
    needsRange: true,
  },
  {
    type: 'queue',
    icon: '🏥',
    title: 'Cola de Atención',
    description:
      'Detalle de todos los ingresos del día: llegada, tipo, estado y veterinario asignado.',
    color: 'indigo',
    needsRange: false,
  },
  {
    type: 'summary',
    icon: '📊',
    title: 'Resumen Estadístico',
    description:
      'KPIs y distribución de citas y atenciones por estado, tipo y día del período.',
    color: 'emerald',
    needsRange: true,
  },
];

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly cards = REPORT_CARDS;
  protected selectedCard: ReportCard | null = null;
  protected isGenerating = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;

  protected readonly rangeForm = this.fb.nonNullable.group({
    from: ['', Validators.required],
    to: ['', Validators.required],
  });

  protected readonly dayForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
  });

  protected get todayIso(): string {
    return new Date().toISOString().substring(0, 10);
  }

  protected get firstDayOfMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  protected selectCard(card: ReportCard): void {
    this.selectedCard = card;
    this.errorMessage = null;
    this.successMessage = null;

    if (card.needsRange) {
      this.rangeForm.patchValue({ from: this.firstDayOfMonth, to: this.todayIso });
    } else {
      this.dayForm.patchValue({ date: this.todayIso });
    }

    this.cdr.markForCheck();
  }

  protected clearSelection(): void {
    this.selectedCard = null;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();
  }

  protected async generate(): Promise<void> {
    if (!this.selectedCard || this.isGenerating) return;

    const card = this.selectedCard;

    if (card.needsRange) {
      if (this.rangeForm.invalid) {
        this.rangeForm.markAllAsTouched();
        return;
      }
    } else {
      if (this.dayForm.invalid) {
        this.dayForm.markAllAsTouched();
        return;
      }
    }

    this.isGenerating = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.cdr.markForCheck();

    try {
      let blob: Blob;
      let filename: string;

      if (card.type === 'appointments') {
        const { from, to } = this.rangeForm.getRawValue();
        blob = await firstValueFrom(this.reportsApi.downloadAppointmentsPdf(from, to));
        filename = `agenda-citas-${from}-a-${to}.pdf`;
      } else if (card.type === 'queue') {
        const { date } = this.dayForm.getRawValue();
        blob = await firstValueFrom(this.reportsApi.downloadQueuePdf(date));
        filename = `cola-atencion-${date}.pdf`;
      } else {
        const { from, to } = this.rangeForm.getRawValue();
        blob = await firstValueFrom(this.reportsApi.downloadSummaryPdf(from, to));
        filename = `resumen-estadistico-${from}-a-${to}.pdf`;
      }

      this.triggerDownload(blob, filename);
      this.successMessage = `PDF generado: ${filename}`;
    } catch {
      this.errorMessage = 'No se pudo generar el reporte. Verifica los parámetros e intenta de nuevo.';
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
