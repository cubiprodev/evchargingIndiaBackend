import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Charger } from './entities/charger.entity';
import {
  CreateChargerDto,
  UpdateChargerDto,
  SearchChargersDto,
} from './dto/charger.dto';
import { ChargerStatus, KycStatus } from '../common/constants';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChargersService {
  constructor(
    @InjectRepository(Charger)
    private chargersRepository: Repository<Charger>,
    private usersService: UsersService,
  ) {}

  async create(ownerId: string, dto: CreateChargerDto): Promise<Charger> {
    const owner = await this.usersService.findById(ownerId);
    if (!owner || owner.kycStatus !== KycStatus.VERIFIED) {
      throw new BadRequestException({
        message:
          'Aadhaar KYC is required before registering a charging station',
        requiresKyc: true,
        kycStatus: owner?.kycStatus ?? KycStatus.NONE,
      });
    }

    const autoVerify =
      process.env.AUTO_VERIFY_CHARGERS === 'true' ||
      process.env.NODE_ENV === 'development';

    const charger = this.chargersRepository.create({
      ...dto,
      ownerId,
      status: autoVerify
        ? ChargerStatus.AVAILABLE
        : ChargerStatus.PENDING_VERIFICATION,
    });
    return this.chargersRepository.save(charger);
  }

  async findById(id: string): Promise<Charger> {
    const charger = await this.chargersRepository.findOne({
      where: { id },
      relations: { owner: true, reviews: true },
    });
    if (!charger) throw new NotFoundException('Charger not found');
    return charger;
  }

  async findByOwner(ownerId: string): Promise<Charger[]> {
    return this.chargersRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async search(dto: SearchChargersDto): Promise<(Charger & { distanceKm: number })[]> {
    const radiusKm = dto.radiusKm || 10;
    const query = this.chargersRepository
      .createQueryBuilder('charger')
      .leftJoinAndSelect('charger.owner', 'owner')
      .where('charger.isActive = :isActive', { isActive: true })
      .andWhere('charger.status != :pending', {
        pending: ChargerStatus.PENDING_VERIFICATION,
      });

    if (dto.chargerType) {
      query.andWhere('charger.chargerType = :type', { type: dto.chargerType });
    }
    if (dto.fastCharging) {
      query.andWhere('charger.isFastCharging = :fast', { fast: true });
    }
    if (dto.maxPrice) {
      query.andWhere('charger.pricePerKwh <= :maxPrice', {
        maxPrice: dto.maxPrice,
      });
    }
    if (dto.availableNow) {
      query.andWhere('charger.status = :status', {
        status: ChargerStatus.AVAILABLE,
      });
    }

    const chargers = await query.getMany();

    return chargers
      .map((charger) => ({
        ...charger,
        distanceKm: this.haversineDistance(
          dto.latitude,
          dto.longitude,
          Number(charger.latitude),
          Number(charger.longitude),
        ),
      }))
      .filter((c) => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateChargerDto,
  ): Promise<Charger> {
    const charger = await this.findById(id);
    if (charger.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized to update this charger');
    }
    Object.assign(charger, dto);
    return this.chargersRepository.save(charger);
  }

  async verify(id: string): Promise<Charger> {
    const charger = await this.findById(id);
    charger.status = ChargerStatus.AVAILABLE;
    return this.chargersRepository.save(charger);
  }

  async updateStatus(id: string, status: ChargerStatus): Promise<Charger> {
    const charger = await this.findById(id);
    charger.status = status;
    return this.chargersRepository.save(charger);
  }

  async findAll(): Promise<Charger[]> {
    return this.chargersRepository.find({
      relations: { owner: true },
      order: { createdAt: 'DESC' },
    });
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
