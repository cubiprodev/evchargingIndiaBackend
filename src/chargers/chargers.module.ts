import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Charger } from './entities/charger.entity';
import { ChargersService } from './chargers.service';
import { ChargersController } from './chargers.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Charger]), UsersModule],
  providers: [ChargersService],
  controllers: [ChargersController],
  exports: [ChargersService],
})
export class ChargersModule {}
