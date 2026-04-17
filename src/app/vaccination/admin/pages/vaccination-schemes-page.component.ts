import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import { VaccinationScheme } from '../models/vaccination-admin.model';

@Component({
  selector: 'app-vaccination-schemes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ShellIconComponent, PaginationComponent],
  templateUrl: './vaccination-schemes-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationSchemesPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly schemes: VaccinationScheme[] = [];
  protected readonly filter = {
    term: '',
  };
  protected readonly paginationMeta: PaginationMeta = { ...EMPTY_PAGINATION_META, itemsPerPage: 8 };

  protected isLoading = false;
  protected loadError: string | null = null;

  ngOnInit(): void {
    void this.loadSchemes();
  }

  protected canManageSchemes(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected retryLoadSchemes(): void {
    void this.loadSchemes();
  }

  protected visibleSchemes(): VaccinationScheme[] {
    const term = this.filter.term.trim().toLowerCase();
    if (!term) {
      return this.schemes;
    }

    return this.schemes.filter((scheme) =>
      [scheme.name, scheme.description ?? '', scheme.species.name]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  protected pagedSchemes(): VaccinationScheme[] {
    const all = this.visibleSchemes();
    const start = (this.paginationMeta.currentPage - 1) * this.paginationMeta.itemsPerPage;
    return all.slice(start, start + this.paginationMeta.itemsPerPage);
  }

  protected goToCreatePage(): void {
    void this.router.navigate(['/vaccination/schemes/new']);
  }

  protected openSchemeDetail(scheme: VaccinationScheme): void {
    void this.router.navigate(['/vaccination/schemes', scheme.id]);
  }

  protected onPageChange(page: number): void {
    this.paginationMeta.currentPage = page;
    this.syncPagination();
  }

  protected onFilterTermChange(): void {
    this.paginationMeta.currentPage = 1;
    this.syncPagination();
  }

  protected activeVersionLabel(scheme: VaccinationScheme): string {
    if (!scheme.activeVersionId) {
      return 'Sin versión vigente';
    }

    const activeVersion = scheme.versions.find((version) => version.id === scheme.activeVersionId);
    return activeVersion ? `v${activeVersion.version}` : 'Sin versión vigente';
  }

  private async loadSchemes(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.vaccinationApi.listSchemes());
      this.schemes.splice(0, this.schemes.length, ...response);
      this.syncPagination();
    } catch {
      this.loadError = 'No se pudieron cargar los esquemas vacunales.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private syncPagination(): void {
    const totalItems = this.visibleSchemes().length;
    const itemsPerPage = this.paginationMeta.itemsPerPage;
    const totalPages = Math.max(Math.ceil(totalItems / itemsPerPage), 1);
    const currentPage = Math.min(this.paginationMeta.currentPage, totalPages);
    const start = (currentPage - 1) * itemsPerPage;
    const itemCount = Math.max(Math.min(itemsPerPage, totalItems - start), 0);

    Object.assign(this.paginationMeta, {
      totalItems,
      itemCount,
      itemsPerPage,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    });
  }
}
