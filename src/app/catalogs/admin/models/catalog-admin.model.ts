export type CatalogAdminKind = 'PROCEDURE' | 'SURGERY';
export type CatalogAdminStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface CatalogAdminItem {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresAnesthesia?: boolean;
}

export interface CatalogAdminFormPayload {
  name: string;
  description?: string;
  requiresAnesthesia?: boolean;
}
