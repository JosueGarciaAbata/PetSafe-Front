import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { buildApiUrl } from '@app/core/config/api.config';
import { CreatePetRequest, CreatePetWithoutTutorRequest } from '../models/create-pet.model';
import { PetCreateResponseApiResponse } from '../models/pet-create-response.model';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';
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
    return this.http.get<PetBasicDetailApiResponse>(
      buildApiUrl(`patients/admin/${id}/basic`),
    );
  }

  updateBasic(
    id: number | string,
    payload: UpdatePetBasicRequest,
  ): Observable<PetBasicDetailApiResponse> {
    return this.http.patch<PetBasicDetailApiResponse>(
      buildApiUrl(`patients/admin/${id}/basic`),
      this.buildPetFormData(payload),
    );
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
    }

    if ('microchipCode' in payload) {
      this.appendPrimitive(formData, 'microchipCode', payload.microchipCode);
    }

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

  private buildPetWithoutTutorFormData(payload: CreatePetWithoutTutorRequest): FormData {
    const formData = new FormData();

    this.appendPrimitive(formData, 'name', payload.name);
    this.appendPrimitive(formData, 'speciesId', payload.speciesId);
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
}
