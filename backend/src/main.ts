import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger / OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('CivicPulse API')
    .setDescription(
      'Community Issue Reporting & Municipal Response Platform — Backend API.\n\n' +
        'Features: citizen report submission, automated department routing, ' +
        'status lifecycle management, analytics, and admin configuration.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Citizen OTP and Staff login flows')
    .addTag('Users', 'User profile and admin user management')
    .addTag('Reports', 'Civic issue report CRUD and status management')
    .addTag('Uploads', 'Pre-signed S3 URL for image uploads')
    .addTag('Analytics', 'Dashboard analytics and CSV export')
    .addTag('Admin Configuration', 'Categories, routing rules, departments')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 CivicPulse API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
