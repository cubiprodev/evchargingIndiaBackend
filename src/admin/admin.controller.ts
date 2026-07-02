import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { ChargersService } from '../chargers/chargers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { UserRole } from '../common/constants';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private usersService: UsersService,
    private chargersService: ChargersService,
  ) {}

  @Get('users')
  getUsers() {
    return this.usersService.findAll();
  }

  @Get('chargers')
  getChargers() {
    return this.chargersService.findAll();
  }

  @Patch('chargers/:id/verify')
  verifyCharger(@Param('id') id: string) {
    return this.chargersService.verify(id);
  }
}
