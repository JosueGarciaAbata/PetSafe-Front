import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { ConfirmDialogComponent } from '@app/shared/confirm-dialog/confirm-dialog.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { CatalogAdminApiService } from '../api/catalog-admin-api.service';
import {
  CatalogAdminFormPayload,
  CatalogAdminItem,
  CatalogAdminKind,
  CatalogAdminStatusFilter,
} from '../models/catalog-admin.model';
import { CatalogItemFormModalComponent } from './catalog-item-form-modal.component';

interface CatalogPageMeta {
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  createLabel: string;
  itemSingular: string;
  itemPlural: string;
}

const PAGE_META_BY_KIND: Record<CatalogAdminKind, CatalogPageMeta> = {
  PROCEDURE: {
    eyebrow: 'Catálogos clínicos',
    title: 'Procedimientos',
    description: 'Gestiona los procedimientos disponibles para atenciones y registros clínicos.',
    searchPlaceholder: 'Buscar por nombre o descripción',
    createLabel: 'Nuevo procedimiento',
    itemSingular: 'procedimiento',
    itemPlural: 'procedimientos',
  },
  SURGERY: {
    eyebrow: 'Catálogos clínicos',
    title: 'Cirugías',
    description: 'Gestiona las cirugías disponibles y su disponibilidad operativa dentro del sistema.',
    searchPlaceholder: 'Buscar por nombre, descripción o anestesia',
    createLabel: 'Nueva cirugía',
    itemSingular: 'cirugía',
    itemPlural: 'cirugías',
  },
};

@Component({
  selector: 'app-catalog-items-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ShellIconComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    CatalogItemFormModalComponent,
  ],
  templateUrl: './catalog-items-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogItemsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private readonly catalogsApi = inject(CatalogAdminApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  private catalogKind: CatalogAdminKind = 'PROCEDURE';
  protected readonly statusFilters: readonly CatalogAdminStatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE'];

  protected readonly items: CatalogAdminItem[] = [];
  protected readonly filter = {
    term: '',
    status: 'ALL' as CatalogAdminStatusFilter,
  };
  protected readonly paginationMeta: PaginationMeta = { ...EMPTY_PAGINATION_META, itemsPerPage: 8 };

  protected isLoading = false;
  protected isSaving = false;
  protected isTogglingStatusId: number | null = null;
  protected isDeletingId: number | null = null;
  protected loadError: string | null = null;
  protected modalError: string | null = null;

  protected isFormModalOpen = false;
  protected editingItem: CatalogAdminItem | null = null;
  protected statusTarget: CatalogAdminItem | null = null;
  protected deleteTarget: CatalogAdminItem | null = null;

  ngOnInit(): void {
    const routeKind = this.route.snapshot.data['catalogKind'];
    this.catalogKind = routeKind === 'SURGERY' ? 'SURGERY' : 'PROCEDURE';
    void this.loadItems();
  }

  protected pageMeta(): CatalogPageMeta {
    return PAGE_META_BY_KIND[this.catalogKind];
  }

  protected currentCatalogKind(): CatalogAdminKind {
    return this.catalogKind;
  }

  protected isSurgeryCatalog(): boolean {
    return this.catalogKind === 'SURGERY';
  }

  protected canManageItems(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected canDeleteItems(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  protected visibleItems(): CatalogAdminItem[] {
    const term = this.filter.term.trim().toLowerCase();

    return this.items.filter((item) => {
      if (this.filter.status === 'ACTIVE' && !item.isActive) {
        return false;
      }

      if (this.filter.status === 'INACTIVE' && item.isActive) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        item.name,
        item.description ?? '',
        this.isSurgeryCatalog() && item.requiresAnesthesia ? 'anestesia' : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }

  protected pagedItems(): CatalogAdminItem[] {
    const all = this.visibleItems();
    const start = (this.paginationMeta.currentPage - 1) * this.paginationMeta.itemsPerPage;
    return all.slice(start, start + this.paginationMeta.itemsPerPage);
  }

  protected itemStatusLabel(item: CatalogAdminItem): string {
    return item.isActive ? 'Activo' : 'Inactivo';
  }

  protected itemStatusClasses(item: CatalogAdminItem): string {
    return item.isActive
      ? 'ps-tone ps-tone--success ps-tone-fill'
      : 'ps-tone ps-tone--attention ps-tone-fill';
  }

  protected anesthesiaLabel(item: CatalogAdminItem): string {
    return item.requiresAnesthesia ? 'Con anestesia' : 'Sin anestesia';
  }

  protected anesthesiaClasses(item: CatalogAdminItem): string {
    return item.requiresAnesthesia
      ? 'ps-tone ps-tone--info ps-tone-fill'
      : 'ps-tone ps-tone--neutral ps-tone-fill';
  }

  protected itemDescription(item: CatalogAdminItem): string {
    return item.description?.trim()
      || `Sin descripción adicional para esta ${this.pageMeta().itemSingular}.`;
  }

  protected totalItemCount(): number {
    return this.items.length;
  }

  protected activeItemCount(): number {
    return this.items.filter((item) => item.isActive).length;
  }

  protected inactiveItemCount(): number {
    return this.items.filter((item) => !item.isActive).length;
  }

  protected filteredItemCount(): number {
    return this.visibleItems().length;
  }

  protected itemOrderLabel(index: number): string {
    const currentPageOffset = (this.paginationMeta.currentPage - 1) * this.paginationMeta.itemsPerPage;
    return String(currentPageOffset + index + 1).padStart(2, '0');
  }

  protected openCreateModal(): void {
    this.editingItem = null;
    this.modalError = null;
    this.isFormModalOpen = true;
  }

  protected openEditModal(item: CatalogAdminItem): void {
    this.editingItem = item;
    this.modalError = null;
    this.isFormModalOpen = true;
  }

  protected closeFormModal(): void {
    if (this.isSaving) {
      return;
    }

    this.isFormModalOpen = false;
    this.modalError = null;
    this.editingItem = null;
  }

  protected openStatusModal(item: CatalogAdminItem): void {
    this.statusTarget = item;
  }

  protected closeStatusModal(): void {
    if (this.isTogglingStatusId !== null) {
      return;
    }

    this.statusTarget = null;
  }

  protected openDeleteModal(item: CatalogAdminItem): void {
    this.deleteTarget = item;
  }

  protected closeDeleteModal(): void {
    if (this.isDeletingId !== null) {
      return;
    }

    this.deleteTarget = null;
  }

  protected onFilterTermChange(): void {
    this.paginationMeta.currentPage = 1;
    this.syncPagination();
  }

  protected setStatusFilter(status: CatalogAdminStatusFilter): void {
    this.filter.status = status;
    this.paginationMeta.currentPage = 1;
    this.syncPagination();
  }

  protected onPageChange(page: number): void {
    this.paginationMeta.currentPage = page;
    this.syncPagination();
  }

  protected async saveItem(payload: CatalogAdminFormPayload): Promise<void> {
    if (!this.canManageItems() || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.modalError = null;
    this.cdr.detectChanges();

    try {
      if (this.catalogKind === 'PROCEDURE') {
        if (this.editingItem) {
          await firstValueFrom(this.catalogsApi.updateProcedure(this.editingItem.id, payload));
          this.toast.success('Procedimiento actualizado.');
        } else {
          await firstValueFrom(this.catalogsApi.createProcedure(payload));
          this.toast.success('Procedimiento creado.');
        }
      } else {
        if (this.editingItem) {
          await firstValueFrom(this.catalogsApi.updateSurgery(this.editingItem.id, payload));
          this.toast.success('Cirugía actualizada.');
        } else {
          await firstValueFrom(this.catalogsApi.createSurgery(payload));
          this.toast.success('Cirugía creada.');
        }
      }

      this.closeFormModal();
      await this.loadItems();
    } catch (error: unknown) {
      this.modalError = resolveApiErrorMessage(error, {
        defaultMessage: `No se pudo guardar la ${this.pageMeta().itemSingular}.`,
      });
      this.toast.error(this.modalError);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async toggleItemStatus(): Promise<void> {
    if (!this.canManageItems() || this.isTogglingStatusId !== null || !this.statusTarget) {
      return;
    }

    const target = this.statusTarget;
    this.isTogglingStatusId = target.id;
    this.cdr.detectChanges();

    try {
      if (this.catalogKind === 'PROCEDURE') {
        if (target.isActive) {
          await firstValueFrom(this.catalogsApi.deactivateProcedure(target.id));
          this.toast.success('Procedimiento desactivado correctamente.');
        } else {
          await firstValueFrom(this.catalogsApi.reactivateProcedure(target.id));
          this.toast.success('Procedimiento reactivado correctamente.');
        }
      } else if (target.isActive) {
        await firstValueFrom(this.catalogsApi.deactivateSurgery(target.id));
        this.toast.success('Cirugía desactivada correctamente.');
      } else {
        await firstValueFrom(this.catalogsApi.reactivateSurgery(target.id));
        this.toast.success('Cirugía reactivada correctamente.');
      }

      this.statusTarget = null;
      await this.loadItems();
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: target.isActive
            ? `No se pudo desactivar la ${this.pageMeta().itemSingular}.`
            : `No se pudo reactivar la ${this.pageMeta().itemSingular}.`,
        }),
      );
    } finally {
      this.isTogglingStatusId = null;
      this.cdr.detectChanges();
    }
  }

  protected async deleteItem(): Promise<void> {
    if (!this.canDeleteItems() || this.isDeletingId !== null || !this.deleteTarget) {
      return;
    }

    const target = this.deleteTarget;
    this.isDeletingId = target.id;
    this.cdr.detectChanges();

    try {
      if (this.catalogKind === 'PROCEDURE') {
        await firstValueFrom(this.catalogsApi.deleteProcedure(target.id));
        this.toast.success('Procedimiento eliminado del catálogo.');
      } else {
        await firstValueFrom(this.catalogsApi.deleteSurgery(target.id));
        this.toast.success('Cirugía eliminada del catálogo.');
      }

      this.deleteTarget = null;
      await this.loadItems();
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: `No se pudo eliminar la ${this.pageMeta().itemSingular}.`,
        }),
      );
    } finally {
      this.isDeletingId = null;
      this.cdr.detectChanges();
    }
  }

  protected statusDialogTitle(): string {
    if (!this.statusTarget) {
      return 'Actualizar estado';
    }

    return this.statusTarget.isActive
      ? `Desactivar ${this.pageMeta().itemSingular}`
      : `Reactivar ${this.pageMeta().itemSingular}`;
  }

  protected statusDialogMessage(): string {
    if (!this.statusTarget) {
      return '';
    }

    return this.statusTarget.isActive
      ? `La ${this.pageMeta().itemSingular} dejará de aparecer en flujos nuevos, pero seguirá visible en registros históricos.`
      : `La ${this.pageMeta().itemSingular} volverá a aparecer en los flujos clínicos y operativos donde aplique.`;
  }

  protected statusDialogConfirmLabel(): string {
    return this.statusTarget?.isActive ? 'Desactivar' : 'Reactivar';
  }

  protected statusDialogBusyLabel(): string {
    return this.statusTarget?.isActive ? 'Desactivando...' : 'Reactivando...';
  }

  protected deleteDialogTitle(): string {
    return `Eliminar ${this.pageMeta().itemSingular}`;
  }

  protected deleteDialogMessage(): string {
    return `Se aplicará borrado lógico sobre ${this.deleteTarget?.name ?? 'este elemento'} y ya no estará disponible en el catálogo.`;
  }

  protected statusFilterLabel(status: CatalogAdminStatusFilter): string {
    switch (status) {
      case 'ACTIVE':
        return 'Activos';
      case 'INACTIVE':
        return 'Inactivos';
      default:
        return 'Todos';
    }
  }

  protected statusFilterClasses(status: CatalogAdminStatusFilter): string {
    if (this.filter.status !== status) {
      return 'border border-border bg-surface text-text-secondary hover:bg-card';
    }

    switch (status) {
      case 'ACTIVE':
        return 'ps-tone ps-tone--success ps-tone-surface';
      case 'INACTIVE':
        return 'ps-tone ps-tone--attention ps-tone-surface';
      default:
        return 'ps-tone ps-tone--info ps-tone-surface';
    }
  }

  private async loadItems(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const response = this.catalogKind === 'PROCEDURE'
        ? await firstValueFrom(this.catalogsApi.listProcedures(true))
        : await firstValueFrom(this.catalogsApi.listSurgeries(true));

      this.items.splice(0, this.items.length, ...response);
      this.syncPagination();
    } catch (error: unknown) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: `No se pudo cargar el catálogo de ${this.pageMeta().itemPlural}.`,
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private syncPagination(): void {
    const totalItems = this.visibleItems().length;
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
