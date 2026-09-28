import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProvidersModule } from '../providers/providers.module';
import { ChatModule } from '../chat/chat.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    UsersModule,
    SubscriptionsModule,
    ProvidersModule,
    ChatModule,
    SearchModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
