import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/review.dto';
import { ChargersService } from '../chargers/chargers.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private chargersService: ChargersService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.reviewsRepository.findOne({
      where: { userId, chargerId: dto.chargerId },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this charger');
    }

    const review = this.reviewsRepository.create({ ...dto, userId });
    const saved = await this.reviewsRepository.save(review);

    await this.updateChargerRating(dto.chargerId);
    return saved;
  }

  async findByCharger(chargerId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { chargerId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateChargerRating(chargerId: string): Promise<void> {
    const reviews = await this.reviewsRepository.find({ where: { chargerId } });
    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const charger = await this.chargersService.findById(chargerId);
    charger.rating = Math.round(avg * 100) / 100;
    charger.totalReviews = reviews.length;
    await this.reviewsRepository.manager.save(charger);
  }
}
