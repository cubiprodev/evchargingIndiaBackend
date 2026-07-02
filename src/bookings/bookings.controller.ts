import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { UserRole } from '../common/constants';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(req.user.id, dto);
  }

  @Get('my')
  myBookings(@Request() req: { user: { id: string; role: string } }) {
    if (req.user.role === UserRole.OWNER) {
      return this.bookingsService.findByOwner(req.user.id);
    }
    return this.bookingsService.findByDriver(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: string } },
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(
      id,
      req.user.id,
      req.user.role,
      dto,
    );
  }
}
