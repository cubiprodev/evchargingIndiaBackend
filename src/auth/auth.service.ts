import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { UserRole } from '../common/constants';

// In-memory OTP store for MVP (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(dto.phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // In production: send via SMS (Twilio, MSG91, etc.)
    console.log(`[DEV OTP] Phone: ${dto.phone}, OTP: ${otp}`);

    return {
      message: 'OTP sent successfully',
      // Only expose OTP in development
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const stored = otpStore.get(dto.phone);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('OTP expired or not found');
    }
    if (stored.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    otpStore.delete(dto.phone);

    let user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      user = await this.usersService.create(
        dto.phone,
        dto.role || UserRole.DRIVER,
      );
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        walletBalance: user.walletBalance,
      },
    };
  }

  async switchRole(userId: string, role: UserRole) {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    return this.usersService.update(userId, { role });
  }
}
