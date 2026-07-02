import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';
import { ChargersService } from '../chargers/chargers.service';
import {
  BookingStatus,
  ChargerStatus,
  PLATFORM_FEE_PER_KWH,
} from '../common/constants';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private chargersService: ChargersService,
  ) {}

  async create(driverId: string, dto: CreateBookingDto): Promise<Booking> {
    const charger = await this.chargersService.findById(dto.chargerId);
    if (charger.status !== ChargerStatus.AVAILABLE) {
      throw new BadRequestException('Charger is not available');
    }

    const estimatedKwh = dto.estimatedKwh || 30;
    const totalAmount = estimatedKwh * Number(charger.pricePerKwh);
    const platformFee = estimatedKwh * PLATFORM_FEE_PER_KWH;
    const ownerEarnings = totalAmount - platformFee;

    const booking = this.bookingsRepository.create({
      driverId,
      chargerId: dto.chargerId,
      scheduledStart: new Date(dto.scheduledStart),
      scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
      estimatedKwh,
      totalAmount,
      platformFee,
      ownerEarnings,
      status: BookingStatus.PENDING,
    });

    return this.bookingsRepository.save(booking);
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

    booking.status = dto.status;
    if (dto.actualKwh) {
      booking.actualKwh = dto.actualKwh;
      const pricePerKwh = Number(booking.charger.pricePerKwh);
      booking.totalAmount = dto.actualKwh * pricePerKwh;
      booking.platformFee = dto.actualKwh * PLATFORM_FEE_PER_KWH;
      booking.ownerEarnings = Number(booking.totalAmount) - Number(booking.platformFee);
    }

    if (dto.status === BookingStatus.IN_PROGRESS) {
      booking.actualStart = new Date();
    }
    if (dto.status === BookingStatus.COMPLETED) {
      booking.actualEnd = new Date();
    }

    return this.bookingsRepository.save(booking);
  }
}
