import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import {
  ChargerType,
  ChargerStatus,
} from '../../common/constants';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('chargers')
export class Charger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column({ default: 'India' })
  country: string;

  @Column({ type: 'enum', enum: ChargerType })
  chargerType: ChargerType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  powerKw: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  pricePerKwh: number;

  @Column({ type: 'enum', enum: ChargerStatus, default: ChargerStatus.PENDING_VERIFICATION })
  status: ChargerStatus;

  @Column({ default: false })
  isFastCharging: boolean;

  @Column({ type: 'simple-array', nullable: true })
  amenities: string[];

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  availability: { day: string; openTime: string; closeTime: string }[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  totalReviews: number;

  @Column({ default: 0 })
  totalUnitsSold: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.chargers)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  @OneToMany(() => Booking, (booking) => booking.charger)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.charger)
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
