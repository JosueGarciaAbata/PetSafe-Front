import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './infra/filters/http-exception.filter.js';
import { getCorsConfig } from './infra/config/cors.config.js';
import { ASSETS_ROOT, ensureAssetsDirectories } from './infra/config/uploads.config.js';

async function bootstrap() {
  ensureAssetsDirectories();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  app.enableCors(getCorsConfig(configService));
  app.useStaticAssets(ASSETS_ROOT, { prefix: '/assets/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((err) => Object.values(err.constraints ?? {}));
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Bad Request',
        });
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `🐾 PetSafe API running on http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
