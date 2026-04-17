import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProceduresApiService } from '../api/procedures-api.service';
import { ProcedureDetailApiResponse } from '../models/procedure-list.model';

@Component({
  selector: 'app-procedure-detail-page',
  standalone: true,
  templateUrl: './procedure-detail-page.component.html',
  styleUrl: './procedure-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedureDetailPageComponent implements OnInit {
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestVersion = 0;
  private backTarget: readonly (string | number)[] = ['/procedures'];
  protected backLabel = 'Volver a procedimientos';

  protected isLoading = false;
  protected loadError: string | null = null;
  protected procedure: ProcedureDetailApiResponse | null = null;

  ngOnInit(): void {
    const navigationState = history.state as {
      backTarget?: readonly (string | number)[] | null;
      backLabel?: string | null;
    } | null;
    this.backTarget = navigationState?.backTarget ?? ['/procedures'];
    this.backLabel = navigationState?.backLabel?.trim() || 'Volver a procedimientos';

    this.route.paramMap.subscribe((params) => {
      const procedureId = params.get('id');
      if (!procedureId) {
        void this.router.navigate(['/procedures']);
        return;
      }

      const requestToken = ++this.requestVersion;
      this.isLoading = true;
      this.loadError = null;
      this.procedure = null;
      this.cdr.detectChanges();
      void this.loadProcedure(procedureId, requestToken);
    });
  }

  protected goBack(): void {
    void this.router.navigate(this.backTarget, { replaceUrl: true });
  }

  protected buildPatientName(): string {
    return this.procedure?.patientName?.trim() || 'Mascota sin nombre';
  }

  protected buildEncounterLabel(): string {
    return this.procedure ? `Consulta #${this.procedure.encounterId}` : 'Consulta no registrada';
  }

  protected buildProcedureType(): string {
    return this.procedure?.procedureType?.trim() || 'Sin tipo registrado';
  }

  protected buildPerformedDateLabel(): string {
    return this.formatDate(this.procedure?.performedDate ?? null);
  }

  protected buildCatalogLabel(): string {
    return this.procedure?.catalog?.name?.trim() || 'Sin catalogo';
  }

  protected buildDescription(): string {
    return this.procedure?.description?.trim() || 'Sin descripcion registrada.';
  }

  protected buildResult(): string {
    return this.procedure?.result?.trim() || 'Sin resultado registrado.';
  }

  protected buildNotes(): string {
    return this.procedure?.notes?.trim() || 'Sin notas registradas.';
  }

  private async loadProcedure(procedureId: string, requestToken: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.proceduresApi.getById(procedureId));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.procedure = response;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el detalle del procedimiento.';
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return value.slice(0, 10);
  }
}
