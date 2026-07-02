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
import {
  CreateBookingDto,
  CreateBookingRequestDto,
  UpdateBookingStatusDto,
  EndChargingDto,
} from './dto/booking.dto';
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post('request')
  createRequest(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateBookingRequestDto,
  ) {
    return this.bookingsService.createRequest(req.user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Get('request/active')
  activeRequest(@Request() req: { user: { id: string } }) {
    return this.bookingsService.findActiveRequest(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post('request/:groupId/cancel')
  cancelRequest(
    @Request() req: { user: { id: string } },
    @Param('groupId') groupId: string,
  ) {
    return this.bookingsService.cancelRequest(req.user.id, groupId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('owner/incoming')
  incomingRequests(@Request() req: { user: { id: string } }) {
    return this.bookingsService.findIncomingByOwner(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Get('session/active')
  activeSession(@Request() req: { user: { id: string } }) {
    return this.bookingsService.findActiveSession(req.user.id);
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.bookingsService.acceptBooking(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.bookingsService.rejectBooking(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(':id/arrive')
  markArrived(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.bookingsService.markArrived(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(':id/start-charging')
  startCharging(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.bookingsService.startCharging(id, req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(':id/end-charging')
  endCharging(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: EndChargingDto,
  ) {
    return this.bookingsService.endCharging(id, req.user.id, dto.actualKwh);
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
