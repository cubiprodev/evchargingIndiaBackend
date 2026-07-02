import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../common/constants';
import { Charger } from '../../chargers/entities/charger.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DRIVER })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  fcmToken: string;

  @OneToMany(() => Charger, (charger) => charger.owner)
  chargers: Charger[];

  @OneToMany(() => Booking, (booking) => booking.driver)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
