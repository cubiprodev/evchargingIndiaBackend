import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChargersService } from './chargers.service';
import {
  CreateChargerDto,
  UpdateChargerDto,
  SearchChargersDto,
} from './dto/charger.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Public } from '../common/decorators';
import { UserRole } from '../common/constants';

@ApiTags('Chargers')
@Controller('chargers')
export class ChargersController {
  constructor(private readonly chargersService: ChargersService) {}

  @Public()
  @Get('search')
  search(@Query() dto: SearchChargersDto) {
    return this.chargersService.search(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('owner/my-chargers')
  myChargers(@Request() req: { user: { id: string } }) {
    return this.chargersService.findByOwner(req.user.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chargersService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateChargerDto,
  ) {
    return this.chargersService.create(req.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateChargerDto,
  ) {
    return this.chargersService.update(id, req.user.id, dto);
  }
}
