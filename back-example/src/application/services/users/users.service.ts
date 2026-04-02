import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../../../domain/entities/auth/user.entity.js';
import { Person } from '../../../domain/entities/persons/person.entity.js';
import { Role } from '../../../domain/entities/auth/role.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';
import { PersonTypeEnum, RoleEnum } from '../../../domain/enums/index.js';
import { RegisterDto } from '../../../presentation/dto/auth/register.dto.js';
import { UpdateProfileDto } from '../../../presentation/dto/auth/update-profile.dto.js';
import { UserProfileResponseDto } from '../../../presentation/dto/users/user-response.dto.js';
import { UserMapper } from '../../mappers/user.mapper.js';
import { TemporaryAccessService } from './temporary-access.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly temporaryAccessService: TemporaryAccessService,
  ) {}

  async createUserWithRole(
    dto: RegisterDto,
    personType: PersonTypeEnum,
    roleName: RoleEnum,
    manager: EntityManager,
  ): Promise<{ savedUser: User; savedPerson: Person; savedUserRole: UserRole | null }> {
    const person = manager.create(Person, {
      personType: personType,
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentId: dto.documentId ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      gender: dto.gender ?? null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
    });
    const savedPerson = await manager.save(Person, person);

    const { savedUser, savedUserRole } = await this.createUserForExistingPerson(
      savedPerson.id,
      dto.email,
      dto.password,
      roleName,
      manager,
    );

    return { savedUser, savedPerson, savedUserRole };
  }

  async createUserForExistingPerson(
    personId: number,
    email: string,
    password: string,
    roleName: RoleEnum,
    manager: EntityManager,
  ): Promise<{ savedUser: User; savedUserRole: UserRole | null }> {
    await this.ensureEmailAvailable(email, manager);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = manager.create(User, {
      personId,
      email,
      passwordHash,
    });
    const savedUser = await manager.save(User, user);

    const targetRole = await manager.findOne(Role, {
      where: { name: roleName },
    });

    let savedUserRole: UserRole | null = null;
    if (targetRole) {
      const userRole = manager.create(UserRole, {
        userId: savedUser.id,
        roleId: targetRole.id,
      });
      savedUserRole = await manager.save(UserRole, userRole);

      savedUser.userRoles = savedUser.userRoles || [];
      savedUser.userRoles.push(userRole);
      userRole.role = targetRole;
    }

    return { savedUser, savedUserRole };
  }

  async provisionClientAccess(
    personId: number,
    email: string,
    manager: EntityManager,
  ): Promise<{
    savedUser: User;
    temporaryPassword: string;
    temporaryPasswordExpiresAt: Date;
    expiresInHours: number;
  }> {
    const temporaryPassword = this.generateSecureTemporaryPassword();

    const { savedUser } = await this.createUserForExistingPerson(
      personId,
      email,
      temporaryPassword,
      RoleEnum.CLIENTE_APP,
      manager,
    );

    const temporaryAccess = await this.temporaryAccessService.createForUser(
      savedUser.id,
      email,
      temporaryPassword,
      manager,
    );

    return {
      savedUser,
      temporaryPassword,
      temporaryPasswordExpiresAt: temporaryAccess.expiresAt,
      expiresInHours: temporaryAccess.expiresInHours,
    };
  }

  async findProfile(userId: number): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return UserMapper.toProfileDto(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['person'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const person = user.person;

    if (dto.firstName !== undefined) person.firstName = dto.firstName;
    if (dto.lastName !== undefined) person.lastName = dto.lastName;
    if (dto.documentId !== undefined) person.documentId = dto.documentId ?? null;
    if (dto.phone !== undefined) person.phone = dto.phone ?? null;
    if (dto.address !== undefined) person.address = dto.address ?? null;
    if (dto.gender !== undefined) person.gender = dto.gender ?? null;
    if (dto.birthDate !== undefined) {
      person.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }

    await this.personRepository.save(person);

    return { message: 'Perfil actualizado correctamente' };
  }

  private async ensureEmailAvailable(email: string, manager: EntityManager): Promise<void> {
    const existingUser = await manager
      .createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')
      .where('u.email = :correo', { correo: email })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }
  }

  private generateSecureTemporaryPassword(length = 16): string {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i += 1) {
      password += alphabet[bytes[i] % alphabet.length];
    }

    return password;
  }
}
