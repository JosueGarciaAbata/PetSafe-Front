import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PaginationMeta } from './pagination.model';

type PaginationItem = number | 'ellipsis';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  @Input({ required: true }) meta!: PaginationMeta;
  @Input() itemLabel = 'registros';
  @Input() maxVisiblePages = 5;

  @Output() readonly pageChange = new EventEmitter<number>();

  protected get startItem(): number {
    if (this.meta.totalItems === 0) {
      return 0;
    }

    return (this.meta.currentPage - 1) * this.meta.itemsPerPage + 1;
  }

  protected get endItem(): number {
    if (this.meta.totalItems === 0) {
      return 0;
    }

    return Math.min(this.startItem + this.meta.itemCount - 1, this.meta.totalItems);
  }

  protected get visiblePages(): PaginationItem[] {
    const totalPages = Math.max(this.meta.totalPages, 1);
    const maxVisiblePages = Math.max(this.maxVisiblePages, 3);

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const currentPage = this.clamp(this.meta.currentPage, 1, totalPages);
    if (currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  }

  protected changePage(page: number): void {
    if (page < 1 || page > this.meta.totalPages || page === this.meta.currentPage) {
      return;
    }

    this.pageChange.emit(page);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
