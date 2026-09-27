import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EchoGPT Backend API')
    .setDescription(
      'EchoGPT Backend REST API supporting multi-AI chat (OpenAI, Claude, Gemini), user & subscription management, web search, and admin analytics.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'System health checks')
    .addTag('Auth', 'Authentication and session tokens')
    .addTag('Users', 'User profile and account operations')
    .addTag('Subscriptions', 'Subscription tiers and request quotas')
    .addTag('AI Providers', 'LLM provider management and configuration')
    .addTag('Chat', 'Chat completions and conversation threads')
    .addTag('Search', 'Web search and query history')
    .addTag('Admin', 'Administrative analytics and system logs')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
