import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import {
  CreatePetRequest,
  CreatePetWithoutTutorRequest,
} from '../models/create-pet.model';
import { PetCreateResponseApiResponse } from '../models/pet-create-response.model';
import {
  AddPetTutorRequest,
  PetBasicDetailApiResponse,
  PetClinicalObservationApiResponse,
  PetDetailCatalogApiResponse,
  PetTutorApiResponse,
} from '../models/pet-detail.model';
import { PetListApiResponse, PetListQuery } from '../models/pet-list.model';
import { UpdatePetBasicRequest } from '../models/update-pet-basic.model';

@Injectable({
  providedIn: 'root',
})
export class PetsApiService {
  private readonly http = inject(HttpClient);
  private readonly listUrl = buildApiUrl('patients/admin/all-basic');
  private readonly createUrl = buildApiUrl('patients');
  private readonly createWithoutTutorUrl = buildApiUrl('patients/admin/without-tutor');

  list(query: PetListQuery): Observable<PetListApiResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    return this.http.get<PetListApiResponse>(this.listUrl, { params });
  }

  create(payload: CreatePetRequest): Observable<PetCreateResponseApiResponse> {
    return this.http.post<PetCreateResponseApiResponse>(this.createUrl, this.buildPetFormData(payload));
  }

  createWithoutTutor(payload: CreatePetWithoutTutorRequest): Observable<PetCreateResponseApiResponse> {
    return this.http.post<PetCreateResponseApiResponse>(
      this.createWithoutTutorUrl,
      this.buildPetWithoutTutorFormData(payload),
    );
  }

  getBasicById(id: number | string): Observable<PetBasicDetailApiResponse> {
    return this.http
      .get<PatientDetailResponse>(buildApiUrl(`patients/admin/${encodeURIComponent(String(id))}/basic`))
      .pipe(map((response) => this.mapPatientDetail(response)));
  }

  updateBasic(
    id: number | string,
    payload: UpdatePetBasicRequest,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http
      .patch<PatientDetailResponse>(
        buildApiUrl(`patients/admin/${encodeURIComponent(String(id))}/basic`),
        this.buildPetFormData(payload),
      )
      .pipe(map((response) => this.mapPatientDetail(response)));
  }

  addTutor(
    id: number | string,
    payload: AddPetTutorRequest,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http
      .post<PatientDetailResponse>(
        buildApiUrl(`patients/${encodeURIComponent(String(id))}/tutors`),
        payload,
      )
      .pipe(map((response) => this.mapPatientDetail(response)));
  }

  setPrimaryTutor(
    id: number | string,
    clientId: number | string,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http
      .patch<PatientDetailResponse>(
        buildApiUrl(
          `patients/${encodeURIComponent(String(id))}/tutors/${encodeURIComponent(String(clientId))}/primary`,
        ),
        {},
      )
      .pipe(map((response) => this.mapPatientDetail(response)));
  }

  removeTutor(
    id: number | string,
    clientId: number | string,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http
      .delete<PatientDetailResponse>(
        buildApiUrl(`patients/${encodeURIComponent(String(id))}/tutors/${encodeURIComponent(String(clientId))}`),
      )
      .pipe(map((response) => this.mapPatientDetail(response)));
  }

  private buildPetFormData(payload: CreatePetRequest | UpdatePetBasicRequest): FormData {
    const formData = new FormData();

    this.appendPrimitive(formData, 'name', payload.name);
    this.appendPrimitive(formData, 'speciesId', payload.speciesId);
    this.appendPrimitive(formData, 'breedId', payload.breedId);
    this.appendPrimitive(formData, 'colorId', payload.colorId);
    this.appendPrimitive(formData, 'sex', payload.sex);
    this.appendPrimitive(formData, 'birthDate', payload.birthDate);
    this.appendPrimitive(formData, 'currentWeight', payload.currentWeight);
    this.appendPrimitive(formData, 'generalAllergies', payload.generalAllergies);
    this.appendPrimitive(formData, 'generalHistory', payload.generalHistory);
    this.appendPrimitive(formData, 'sterilized', payload.sterilized);

    if ('clientId' in payload) {
      this.appendPrimitive(formData, 'clientId', payload.clientId);
      this.appendPrimitive(formData, 'vaccinationSchemeId', payload.vaccinationSchemeId);
    }

    if ('microchipCode' in payload) {
      this.appendPrimitive(formData, 'microchipCode', payload.microchipCode);
    }

    if (payload.image) {
      formData.append('image', payload.image, payload.image.name);
    }

    return formData;
  }

  private buildPetWithoutTutorFormData(payload: CreatePetWithoutTutorRequest): FormData {
    const formData = new FormData();

    this.appendPrimitive(formData, 'name', payload.name);
    this.appendPrimitive(formData, 'speciesId', payload.speciesId);
    this.appendPrimitive(formData, 'vaccinationSchemeId', payload.vaccinationSchemeId);
    this.appendPrimitive(formData, 'breedId', payload.breedId);
    this.appendPrimitive(formData, 'colorId', payload.colorId);
    this.appendPrimitive(formData, 'sex', payload.sex);
    this.appendPrimitive(formData, 'birthDate', payload.birthDate);
    this.appendPrimitive(formData, 'currentWeight', payload.currentWeight);
    this.appendPrimitive(formData, 'sterilized', payload.sterilized);
    this.appendPrimitive(formData, 'microchipCode', payload.microchipCode);
    this.appendPrimitive(formData, 'distinguishingMarks', payload.distinguishingMarks);
    this.appendPrimitive(formData, 'generalAllergies', payload.generalAllergies);
    this.appendPrimitive(formData, 'generalHistory', payload.generalHistory);

    if (payload.image) {
      formData.append('image', payload.image, payload.image.name);
    }

    return formData;
  }

  private appendPrimitive(formData: FormData, key: string, value: string | number | boolean | null | undefined): void {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, String(value));
  }

  private mapPatientDetail(response: PatientDetailResponse): PetBasicDetailApiResponse {
    const birthDate = this.normalizeDate(response.birthDate);

    return {
      id: response.id,
      name: response.name,
      species: this.mapCatalog(response.species),
      breed: this.mapCatalog(response.breed),
      sex: response.sex ?? null,
      currentWeight: response.currentWeight ?? null,
      birthDate,
      ageYears: this.resolveAgeYears(birthDate),
      color: this.mapCatalog(response.color),
      sterilized: response.sterilized ?? null,
      generalAllergies: response.generalAllergies ?? null,
      generalHistory: response.generalHistory ?? null,
      image: response.image ?? null,
      tutors: [...(response.tutors ?? [])].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)),
      clinicalObservations: response.conditions ?? response.clinicalObservations ?? [],
      recentActivity: response.recentActivity ?? null,
    };
  }

  private mapCatalog(
    value: PatientDetailCatalogResponse | null | undefined,
  ): PetDetailCatalogApiResponse | null {
    if (!value) {
      return null;
    }

    return {
      id: value.id,
      name: value.name,
    };
  }

  private normalizeDate(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }

    return null;
  }

  private resolveAgeYears(birthDate: string | null): number | null {
    if (!birthDate) {
      return null;
    }

    const parsedDate = new Date(birthDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const now = new Date();
    let years = now.getFullYear() - parsedDate.getFullYear();
    const monthDiff = now.getMonth() - parsedDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsedDate.getDate())) {
      years -= 1;
    }

    return Math.max(years, 0);
  }
}

interface PatientDetailCatalogResponse {
  id: number;
  name: string;
}

interface PatientDetailResponse {
  id: number;
  name: string;
  sex: string | null;
  birthDate: string | Date | null;
  currentWeight: number | null;
  sterilized: boolean | null;
  generalAllergies: string | null;
  generalHistory: string | null;
  species: PatientDetailCatalogResponse | null;
  breed: PatientDetailCatalogResponse | null;
  color: PatientDetailCatalogResponse | null;
  image: PetBasicDetailApiResponse['image'];
  tutors?: PetTutorApiResponse[];
  conditions?: PetClinicalObservationApiResponse[];
  clinicalObservations?: PetClinicalObservationApiResponse[];
  recentActivity?: unknown | null;
}
