export type OwnerGender = 'Femenino' | 'Masculino';

export interface OwnerApiResponse {
  id: string;
  cedula?: string;
  nombre: string;
  apellido: string;
  genero: OwnerGender;
  numero_telefonico: string;
  contacto: OwnerContactInfo;
  mascotas_asociadas: OwnerPetsSummary;
}

export interface OwnerContactInfo {
  correo_electronico: string;
  direccion: string;
}

export interface OwnerPetsSummary {
  array_nombres: string[];
  total_mascotas: number;
}
