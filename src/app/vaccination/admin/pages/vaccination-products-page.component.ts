import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { SpeciesApiResponse } from '@app/pets/models/species.model';
import { SpeciesApiService } from '@app/pets/services/species-api.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { VaccinationAdminApiService } from '../api/vaccination-admin-api.service';
import {
  CreateVaccinationProductRequest,
  VaccinationProductItem,
} from '../models/vaccination-admin.model';
import { VaccinationProductFormModalComponent } from './vaccination-product-form-modal.component';
import { VaccinationProductHideModalComponent } from './vaccination-product-hide-modal.component';

@Component({
  selector: 'app-vaccination-products-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ShellIconComponent,
    PaginationComponent,
    VaccinationProductFormModalComponent,
    VaccinationProductHideModalComponent,
  ],
  templateUrl: './vaccination-products-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaccinationProductsPageComponent implements OnInit {
  private readonly speciesApi = inject(SpeciesApiService);
  private readonly vaccinationApi = inject(VaccinationAdminApiService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly speciesOptions: SpeciesApiResponse[] = [];
  protected readonly products: VaccinationProductItem[] = [];
  protected readonly filter = {
    term: '',
    status: 'ALL' as 'ALL' | 'ACTIVE' | 'INACTIVE',
  };
  protected readonly paginationMeta: PaginationMeta = { ...EMPTY_PAGINATION_META, itemsPerPage: 8 };

  protected isLoading = false;
  protected isLoadingSpecies = false;
  protected isSaving = false;
  protected isHidingId: number | null = null;
  protected loadError: string | null = null;

  protected isModalOpen = false;
  protected modalError: string | null = null;
  protected editingProduct: VaccinationProductItem | null = null;
  protected hideTarget: VaccinationProductItem | null = null;

  ngOnInit(): void {
    void this.loadSpecies();
    void this.loadProducts();
  }

  protected canManageProducts(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected retryLoadProducts(): void {
    void this.loadProducts();
  }

  protected canHideProducts(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  protected visibleProducts(): VaccinationProductItem[] {
    const term = this.filter.term.trim().toLowerCase();
    return this.products.filter((product) => {
      if (this.filter.status === 'ACTIVE' && !product.isActive) {
        return false;
      }

      if (this.filter.status === 'INACTIVE' && product.isActive) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [product.name, product.species.name, product.isRevaccination ? 'refuerzo' : 'base']
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }

  protected pagedProducts(): VaccinationProductItem[] {
    const all = this.visibleProducts();
    const start = (this.paginationMeta.currentPage - 1) * this.paginationMeta.itemsPerPage;
    return all.slice(start, start + this.paginationMeta.itemsPerPage);
  }

  protected pagedProductsBySpecies(): Array<{
    speciesId: number;
    speciesName: string;
    products: VaccinationProductItem[];
  }> {
    const groups = new Map<number, { speciesName: string; products: VaccinationProductItem[] }>();

    for (const product of this.pagedProducts()) {
      const current = groups.get(product.species.id);
      if (current) {
        current.products.push(product);
        continue;
      }

      groups.set(product.species.id, {
        speciesName: product.species.name,
        products: [product],
      });
    }

    return Array.from(groups.entries())
      .map(([speciesId, group]) => ({
        speciesId,
        speciesName: group.speciesName,
        products: group.products,
      }))
      .sort((left, right) => left.speciesName.localeCompare(right.speciesName));
  }

  protected productTypeLabel(product: VaccinationProductItem): string {
    return product.isRevaccination ? 'Refuerzo' : 'Base';
  }

  protected productTypeClasses(product: VaccinationProductItem): string {
    return product.isRevaccination
      ? 'bg-[#EFF6FF] text-[#1D4ED8]'
      : 'bg-[#F1F5F9] text-text-secondary';
  }

  protected productStatusLabel(product: VaccinationProductItem): string {
    return product.isActive ? 'Activo' : 'Inactivo';
  }

  protected productStatusClasses(product: VaccinationProductItem): string {
    return product.isActive
      ? 'bg-[#ecfdf3] text-[#166534]'
      : 'bg-[#fff7ed] text-[#c2410c]';
  }

  protected openCreateModal(): void {
    this.editingProduct = null;
    this.modalError = null;
    this.isModalOpen = true;
  }

  protected openEditModal(product: VaccinationProductItem): void {
    this.editingProduct = product;
    this.modalError = null;
    this.isModalOpen = true;
  }

  protected closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.isModalOpen = false;
    this.modalError = null;
    this.editingProduct = null;
  }

  protected openHideModal(product: VaccinationProductItem): void {
    this.hideTarget = product;
  }

  protected closeHideModal(): void {
    if (this.isHidingId !== null) {
      return;
    }

    this.hideTarget = null;
  }

  protected onPageChange(page: number): void {
    this.paginationMeta.currentPage = page;
    this.syncPagination();
  }

  protected onFilterTermChange(): void {
    this.paginationMeta.currentPage = 1;
    this.syncPagination();
  }

  protected setStatusFilter(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.filter.status = status;
    this.paginationMeta.currentPage = 1;
    this.syncPagination();
  }

  protected async saveProduct(payload: CreateVaccinationProductRequest): Promise<void> {
    if (!this.canManageProducts() || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.modalError = null;
    this.cdr.detectChanges();

    try {
      if (this.editingProduct) {
        await firstValueFrom(
          this.vaccinationApi.updateProduct(this.editingProduct.id, {
            name: payload.name,
            isRevaccination: payload.isRevaccination,
          }),
        );
        this.toast.success('Producto vacunal actualizado.');
      } else {
        await firstValueFrom(this.vaccinationApi.createProduct(payload));
        this.toast.success('Producto vacunal creado.');
      }

      this.closeModal();
      await this.loadProducts();
    } catch (error: unknown) {
      this.modalError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo guardar el producto vacunal.',
      });
      this.toast.error(this.modalError);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async toggleProductStatus(): Promise<void> {
    if (!this.canHideProducts() || this.isHidingId !== null || !this.hideTarget) {
      return;
    }

    const isActive = this.hideTarget.isActive;
    this.isHidingId = this.hideTarget.id;
    this.cdr.detectChanges();

    try {
      if (isActive) {
        await firstValueFrom(this.vaccinationApi.deactivateProduct(this.hideTarget.id));
        this.toast.success('Producto desactivado correctamente.');
      } else {
        await firstValueFrom(this.vaccinationApi.reactivateProduct(this.hideTarget.id));
        this.toast.success('Producto reactivado correctamente.');
      }
      this.hideTarget = null;
      await this.loadProducts();
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: isActive
            ? 'No se pudo desactivar el producto.'
            : 'No se pudo reactivar el producto.',
        }),
      );
    } finally {
      this.isHidingId = null;
      this.cdr.detectChanges();
    }
  }

  private async loadSpecies(): Promise<void> {
    this.isLoadingSpecies = true;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.speciesApi.list({ page: 1, limit: 100 }));
      this.speciesOptions.splice(0, this.speciesOptions.length, ...response.data);
    } catch {
      this.toast.error('No se pudo cargar la lista de especies.');
    } finally {
      this.isLoadingSpecies = false;
      this.cdr.detectChanges();
    }
  }

  private async loadProducts(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.vaccinationApi.listProducts({ onlyActive: false }),
      );
      this.products.splice(0, this.products.length, ...response);
      this.syncPagination();
    } catch (error: unknown) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cargar el catalogo de productos.',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private syncPagination(): void {
    const totalItems = this.visibleProducts().length;
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
