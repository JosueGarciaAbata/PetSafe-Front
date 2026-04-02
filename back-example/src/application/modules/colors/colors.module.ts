import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ColorsService } from '../../services/colors/colors.service.js';
import { ColorsController } from '../../../presentation/controllers/colors/colors.controller.js';

import { Color } from '../../../domain/entities/catalogs/color.entity.js';
import { Patient } from '../../../domain/entities/patients/patient.entity.js';
import { UserRole } from '../../../domain/entities/auth/user-role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Color, Patient, UserRole])],
  controllers: [ColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule {}
