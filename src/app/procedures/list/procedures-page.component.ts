import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import { ProceduresApiService } from '../api/procedures-api.service';
import { ProcedureListItemApiResponse } from '../models/procedure-list.model';

@Component({
  selector: 'app-procedures-page',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './procedures-page.component.html',
  styleUrl: './procedures-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProceduresPageComponent implements OnInit {
  private readonly proceduresApi = inject(ProceduresApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;

  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected procedures: ProcedureListItemApiResponse[] = [];
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected searchValue = '';
  protected isLoading = false;
  protected loadError: string | null = null;

  ngOnInit(): void {
    void this.loadProcedures(1);
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadProcedures(page);
  }

  protected retryLoadProcedures(): void {
    void this.loadProcedures(this.meta.currentPage);
  }

  protected openProcedureDetail(procedure: ProcedureListItemApiResponse): void {
    void this.router.navigate(['/procedures', procedure.id], {
      state: {
        backTarget: ['/procedures'],
        backLabel: 'Volver a procedimientos',
      },
    });
  }

  protected clearFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.searchValue = '';
    this.clearSearchTimer();
    void this.loadProcedures(1);
  }

  protected get hasActiveFilters(): boolean {
    return this.searchValue.trim().length > 0;
  }

  protected buildPatientName(procedure: ProcedureListItemApiResponse): string {
    return procedure.patientName?.trim() || 'Mascota sin nombre';
  }

  protected buildProcedureType(procedure: ProcedureListItemApiResponse): string {
    return procedure.procedureType?.trim() || 'Sin tipo registrado';
  }

  protected buildPerformedDateLabel(procedure: ProcedureListItemApiResponse): string {
    return this.formatDate(procedure.performedDate);
  }

  protected buildEncounterLabel(procedure: ProcedureListItemApiResponse): string {
    return `Consulta #${procedure.encounterId}`;
  }

  protected trackItem(index: number, item: ProcedureListItemApiResponse): number {
    return item.id ?? index;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadProcedures(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadProcedures(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.procedures = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.proceduresApi.list({
          page,
          limit: this.pageSize,
          search: this.searchValue.trim() || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.procedures = response.data;
      this.meta = response.meta;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el listado de procedimientos.';
      this.meta = EMPTY_PAGINATION_META;
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
