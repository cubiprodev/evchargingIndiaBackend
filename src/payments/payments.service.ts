import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto, CompletePaymentDto } from '../bookings/dto/booking.dto';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentStatus, BookingStatus } from '../common/constants';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private bookingsService: BookingsService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    const booking = await this.bookingsService.findById(dto.bookingId);
    if (booking.driverId !== userId) {
      throw new BadRequestException('Not authorized');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking is not pending payment');
    }

    const payment = this.paymentsRepository.create({
      bookingId: dto.bookingId,
      amount: booking.totalAmount,
      method: dto.method,
      status: PaymentStatus.PENDING,
      razorpayOrderId: `order_${Date.now()}`,
    });

    return this.paymentsRepository.save(payment);
  }

  async complete(dto: CompletePaymentDto): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { transactionId: dto.transactionId },
      relations: { booking: true },
    });

    if (!payment) {
      const byOrder = await this.paymentsRepository.findOne({
        where: { razorpayOrderId: dto.transactionId },
        relations: { booking: true },
      });
      if (!byOrder) throw new NotFoundException('Payment not found');
      return this.markComplete(byOrder, dto);
    }

    return this.markComplete(payment, dto);
  }

  private async markComplete(
    payment: Payment,
    dto: CompletePaymentDto,
  ): Promise<Payment> {
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = dto.transactionId;
    if (dto.razorpayPaymentId) {
      payment.razorpayPaymentId = dto.razorpayPaymentId;
    }
    await this.paymentsRepository.save(payment);

    await this.bookingsService.updateStatus(
      payment.bookingId,
      payment.booking.driverId,
      'driver',
      { status: BookingStatus.CONFIRMED },
    );

    return payment;
  }

  async findByBooking(bookingId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({ where: { bookingId } });
  }
}
