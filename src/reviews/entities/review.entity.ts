import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Charger } from '../../chargers/entities/charger.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Charger, (charger) => charger.reviews)
  @JoinColumn({ name: 'chargerId' })
  charger: Charger;

  @Column()
  chargerId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'int', nullable: true })
  cleanlinessRating: number;

  @Column({ type: 'int', nullable: true })
  safetyRating: number;

  @Column({ type: 'int', nullable: true })
  speedRating: number;

  @Column({ type: 'int', nullable: true })
  ownerBehaviorRating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
