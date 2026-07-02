import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Booking } from './entities/booking.entity';
import { Charger } from '../chargers/entities/charger.entity';
import {
  CreateBookingDto,
  CreateBookingRequestDto,
  UpdateBookingStatusDto,
} from './dto/booking.dto';
import { ChargersService } from '../chargers/chargers.service';
import {
  BookingStatus,
  BookingRequestType,
  ChargerStatus,
  PLATFORM_FEE_PER_KWH,
} from '../common/constants';

const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private chargersService: ChargersService,
  ) {}

  private buildAmounts(estimatedKwh: number, pricePerKwh: number) {
    const totalAmount = estimatedKwh * pricePerKwh;
    const platformFee = estimatedKwh * PLATFORM_FEE_PER_KWH;
    const ownerEarnings = totalAmount - platformFee;
    return { totalAmount, platformFee, ownerEarnings };
  }

  private async assertDriverCanRequestCharger(
    driverId: string,
    chargerId: string,
  ) {
    const existingForDriver = await this.bookingsRepository.findOne({
      where: {
        driverId,
        chargerId,
        status: In(ACTIVE_BOOKING_STATUSES),
      },
    });
    if (existingForDriver) {
      throw new BadRequestException(
        'You already have an active request or booking for this station',
      );
    }

    const existingOnCharger = await this.bookingsRepository.findOne({
      where: {
        chargerId,
        status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
      },
    });
    if (existingOnCharger) {
      throw new BadRequestException(
        'This station already has an accepted charging session',
      );
    }
  }

  private async createBookingForCharger(
    driverId: string,
    chargerId: string,
    dto: {
      scheduledStart: string;
      scheduledEnd?: string;
      estimatedKwh?: number;
      driverLatitude?: number;
      driverLongitude?: number;
    },
    requestGroupId: string,
    requestType: BookingRequestType,
  ): Promise<Booking> {
    const charger = await this.chargersService.findById(chargerId);
    if (charger.status !== ChargerStatus.AVAILABLE) {
      throw new BadRequestException(`${charger.name} is not available`);
    }

    await this.assertDriverCanRequestCharger(driverId, chargerId);

    const estimatedKwh = dto.estimatedKwh || 30;
    const amounts = this.buildAmounts(
      estimatedKwh,
      Number(charger.pricePerKwh),
    );

    const booking = this.bookingsRepository.create({
      driverId,
      chargerId,
      scheduledStart: new Date(dto.scheduledStart),
      scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
      estimatedKwh,
      ...amounts,
      status: BookingStatus.PENDING,
      requestType,
      requestGroupId,
      driverLatitude: dto.driverLatitude,
      driverLongitude: dto.driverLongitude,
    });

    return this.bookingsRepository.save(booking);
  }

  async create(driverId: string, dto: CreateBookingDto): Promise<Booking> {
    const requestGroupId = randomUUID();
    return this.createBookingForCharger(
      driverId,
      dto.chargerId,
      dto,
      requestGroupId,
      BookingRequestType.DIRECT,
    );
  }

  async createRequest(driverId: string, dto: CreateBookingRequestDto) {
    const requestGroupId = randomUUID();
    const estimatedKwh = dto.estimatedKwh || 30;
    const scheduledStart = dto.scheduledStart;

    if (dto.chargerId) {
      const booking = await this.createBookingForCharger(
        driverId,
        dto.chargerId,
        {
          scheduledStart,
          scheduledEnd: dto.scheduledEnd,
          estimatedKwh,
          driverLatitude: dto.latitude,
          driverLongitude: dto.longitude,
        },
        requestGroupId,
        BookingRequestType.DIRECT,
      );

      const full = await this.findById(booking.id);
      return {
        requestGroupId,
        requestType: BookingRequestType.DIRECT,
        stationsNotified: 1,
        bookings: [full],
      };
    }

    if (dto.latitude == null || dto.longitude == null) {
      throw new BadRequestException(
        'Provide chargerId or latitude/longitude for a broadcast request',
      );
    }

    const nearby = await this.chargersService.search({
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusKm: dto.radiusKm || 10,
      availableNow: true,
    });

    if (nearby.length === 0) {
      throw new BadRequestException(
        'No available charging stations found nearby',
      );
    }

    const bookings: Booking[] = [];
    for (const charger of nearby) {
      try {
        const booking = await this.createBookingForCharger(
          driverId,
          charger.id,
          {
            scheduledStart,
            scheduledEnd: dto.scheduledEnd,
            estimatedKwh,
            driverLatitude: dto.latitude,
            driverLongitude: dto.longitude,
          },
          requestGroupId,
          BookingRequestType.BROADCAST,
        );
        bookings.push(booking);
      } catch {
        // Skip stations the driver already has active requests for
      }
    }

    if (bookings.length === 0) {
      throw new BadRequestException(
        'No stations available — you may already have pending requests for all nearby stations',
      );
    }

    const fullBookings = await Promise.all(
      bookings.map((b) => this.findById(b.id)),
    );

    return {
      requestGroupId,
      requestType: BookingRequestType.BROADCAST,
      stationsNotified: fullBookings.length,
      bookings: fullBookings,
    };
  }

  async findActiveRequest(driverId: string) {
    const pending = await this.bookingsRepository.find({
      where: {
        driverId,
        status: BookingStatus.PENDING,
      },
      relations: { charger: { owner: true } },
      order: { createdAt: 'DESC' },
    });

    if (pending.length === 0) {
      return null;
    }

    const requestGroupId = pending[0].requestGroupId;
    const groupBookings = requestGroupId
      ? pending.filter((b) => b.requestGroupId === requestGroupId)
      : [pending[0]];

    return {
      requestGroupId: requestGroupId || pending[0].id,
      requestType: pending[0].requestType,
      stationsNotified: groupBookings.length,
      bookings: groupBookings,
    };
  }

  async findIncomingByOwner(ownerId: string): Promise<Booking[]> {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.charger', 'charger')
      .leftJoinAndSelect('booking.driver', 'driver')
      .where('charger.ownerId = :ownerId', { ownerId })
      .andWhere('booking.status = :status', { status: BookingStatus.PENDING })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { driver: true, charger: { owner: true }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByDriver(driverId: string): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { driverId },
      relations: { charger: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByOwner(ownerId: string): Promise<Booking[]> {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.charger', 'charger')
      .leftJoinAndSelect('booking.driver', 'driver')
      .where('charger.ownerId = :ownerId', { ownerId })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }

  async acceptBooking(id: string, ownerId: string): Promise<Booking> {
    return this.bookingsRepository.manager.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id },
        relations: { charger: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.charger.ownerId !== ownerId) {
        throw new ForbiddenException('Not authorized');
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('This request is no longer pending');
      }

      booking.status = BookingStatus.CONFIRMED;
      await manager.save(booking);

      if (booking.requestGroupId) {
        await manager.update(
          Booking,
          {
            requestGroupId: booking.requestGroupId,
            status: BookingStatus.PENDING,
            id: Not(booking.id),
          },
          { status: BookingStatus.CANCELLED },
        );
      }

      await manager.update(
        Booking,
        {
          chargerId: booking.chargerId,
          status: BookingStatus.PENDING,
          id: Not(booking.id),
        },
        { status: BookingStatus.CANCELLED },
      );

      await manager.update(
        Charger,
        { id: booking.chargerId },
        { status: ChargerStatus.OCCUPIED_SOON },
      );

      return this.findById(booking.id);
    });
  }

  async rejectBooking(id: string, ownerId: string): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.charger.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }

    booking.status = BookingStatus.REJECTED;
    return this.bookingsRepository.save(booking);
  }

  async cancelRequest(driverId: string, requestGroupId: string) {
    const bookings = await this.bookingsRepository.find({
      where: {
        driverId,
        requestGroupId,
        status: BookingStatus.PENDING,
      },
    });

    if (bookings.length === 0) {
      throw new NotFoundException('No active request found to cancel');
    }

    await this.bookingsRepository.update(
      {
        driverId,
        requestGroupId,
        status: BookingStatus.PENDING,
      },
      { status: BookingStatus.CANCELLED },
    );

    return {
      message: 'Charging request cancelled',
      cancelledCount: bookings.length,
    };
  }

  async updateStatus(
    id: string,
    userId: string,
    userRole: string,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findById(id);

    if (userRole === 'owner' && booking.charger.ownerId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (userRole === 'driver' && booking.driverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const newStatus = dto.status;
    booking.status = newStatus;
    if (dto.actualKwh) {
      booking.actualKwh = dto.actualKwh;
      const pricePerKwh = Number(booking.charger.pricePerKwh);
      booking.totalAmount = dto.actualKwh * pricePerKwh;
      booking.platformFee = dto.actualKwh * PLATFORM_FEE_PER_KWH;
      booking.ownerEarnings =
        Number(booking.totalAmount) - Number(booking.platformFee);
    }

    if (newStatus === BookingStatus.IN_PROGRESS) {
      booking.actualStart = new Date();
      await this.chargersService.updateStatus(
        booking.chargerId,
        ChargerStatus.OCCUPIED,
      );
    }
    if (newStatus === BookingStatus.COMPLETED) {
      booking.actualEnd = new Date();
      await this.chargersService.updateStatus(
        booking.chargerId,
        ChargerStatus.AVAILABLE,
      );
    }
    if (
      newStatus === BookingStatus.CANCELLED ||
      newStatus === BookingStatus.REJECTED
    ) {
      const otherActive = await this.bookingsRepository.findOne({
        where: {
          chargerId: booking.chargerId,
          status: In([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
          id: Not(booking.id),
        },
      });
      if (!otherActive) {
        await this.chargersService.updateStatus(
          booking.chargerId,
          ChargerStatus.AVAILABLE,
        );
      }
    }

    return this.bookingsRepository.save(booking);
  }
}
