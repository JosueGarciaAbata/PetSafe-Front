export type PetGender = 'Macho' | 'Hembra';
export type PetSterilized = 'Sí' | 'No';

export interface PetOwnerSummary {
  id: string;
  nombre: string;
  apellido: string;
  contacto: string;
  email?: string;
  direccion?: string;
}

export interface PetApiResponse {
  id: string;
  nombre: string;
  especie: string;
  raza?: string | null;
  imagen?: string;
  tutor: PetOwnerSummary;
  edad: string;
  genero: PetGender;
  pesoKg: string;
  color: string;
  esterilizado: PetSterilized;
  fechaNacimiento: string | null;
  observaciones?: string;
  actividadReciente?: string;
  detalleActividad?: string;
}
