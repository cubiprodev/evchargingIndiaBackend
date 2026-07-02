import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ChargersModule } from '../chargers/chargers.module';

@Module({
  imports: [UsersModule, ChargersModule],
  controllers: [AdminController],
})
export class AdminModule {}
