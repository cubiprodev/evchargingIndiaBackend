import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/constants';
import { User } from '../../users/entities/user.entity';
import { Charger } from '../../chargers/entities/charger.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column()
  driverId: string;

  @ManyToOne(() => Charger, (charger) => charger.bookings)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @Column()
  chargerId: string;

  @Column({ type: 'timestamp' })
  scheduledStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedKwh: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  actualKwh: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ownerEarnings: number;

  @OneToOne(() => Payment, (payment) => payment.booking, { nullable: true })
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
