import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientsService } from '../../services/clients/clients.service.js';
import { ClientAccessService } from '../../services/clients/client-access.service.js';
import { ClientsController } from '../../../presentation/controllers/clients/clients.controller.js';

import { Client } from '../../../domain/entities/persons/client.entity.js';
import { Person } from '../../../domain/entities/persons/person.entity.js';
import { User } from '../../../domain/entities/auth/user.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { PatientTutor } from '../../../domain/entities/patients/patient-tutor.entity.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Person, User, UserRole, PatientTutor]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService, ClientAccessService],
  exports: [ClientsService, ClientAccessService],
})
export class ClientsModule {}
