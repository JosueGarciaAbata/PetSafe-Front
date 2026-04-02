import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Client } from '../../../domain/entities/persons/client.entity.js';
import { User } from '../../../domain/entities/auth/user.entity.js';
import { ClientAccessDto } from '../../../presentation/dto/clients/client-access.dto.js';
import { ClientResponseDto } from '../../../presentation/dto/clients/client-response.dto.js';
import { UsersService } from '../users/users.service.js';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service.js';
import { AuthNotificationContentFactory } from '../notifications/templates/auth-notification-content.factory.js';
import { ClientMapper } from '../../mappers/client.mapper.js';

@Injectable()
export class ClientAccessService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly notificationContentFactory: AuthNotificationContentFactory,
  ) {}

  async createAccessForExistingClient(
    clientId: number,
    dto: ClientAccessDto,
  ): Promise<ClientResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const client = await this.findClientForAccess(clientId, manager);
      const email = await this.createAccessForClient(client, dto, manager);
      return ClientMapper.toResponseDto(client, email);
    });
  }

  async createAccessIfRequested(
    client: Client,
    accessDto: ClientAccessDto | undefined,
    manager: EntityManager,
  ): Promise<string | null> {
    if (!accessDto) {
      return null;
    }

    return this.createAccessForClient(client, accessDto, manager);
  }

  private async createAccessForClient(
    client: Client,
    dto: ClientAccessDto,
    manager: EntityManager,
  ): Promise<string> {
    await this.ensureClientCanReceiveAccess(client.personId, manager);

    const access = await this.usersService.provisionClientAccess(
      client.personId,
      dto.email,
      manager,
    );

    try {
      await this.notificationDispatcher.send(
        this.notificationContentFactory.buildAccountCreatedMessage({
          email: dto.email,
          fullName: `${client.person.firstName} ${client.person.lastName}`.trim(),
          temporaryPassword: access.temporaryPassword,
          expiresInHours: access.expiresInHours,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'No se pudo enviar el correo con las credenciales de acceso',
      );
    }

    return dto.email;
  }

  private async findClientForAccess(
    clientId: number,
    manager: EntityManager,
  ): Promise<Client> {
    const client = await manager
      .getRepository(Client)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.person', 'p')
      .where('c.id = :id', { id: clientId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('p.deleted_at IS NULL')
      .getOne();

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (!client.isActive || !client.person.isActive) {
      throw new ConflictException('No se puede otorgar acceso a un cliente inactivo');
    }

    return client;
  }

  private async ensureClientCanReceiveAccess(
    personId: number,
    manager: EntityManager,
  ): Promise<void> {
    const existingUser = await manager.getRepository(User).findOne({
      where: { personId },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('El cliente ya tiene una cuenta de acceso');
    }
  }
}
