import { Client } from '../../domain/entities/persons/client.entity.js';
import { ClientResponseDto } from '../../presentation/dto/clients/client-response.dto.js';
import { UserMapper } from './user.mapper.js';

export class ClientMapper {
  static toResponseDto(client: Client, email?: string | null): ClientResponseDto {
    return {
      id: client.id,
      active: client.isActive,
      notes: client.notes ?? null,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      email: email ?? null,
      person: client.person ? UserMapper.toPersonDto(client.person) : ({} as any),
    };
  }
}
