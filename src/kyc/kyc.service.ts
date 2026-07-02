import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SubmitAadhaarKycDto, VerifyAadhaarKycDto } from './dto/kyc.dto';
import { KycStatus } from '../common/constants';

const kycOtpStore = new Map<
  string,
  { otp: string; expiresAt: number; aadhaarName: string }
>();

@Injectable()
export class KycService {
  constructor(private usersService: UsersService) {}

  async getStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    return {
      kycStatus: user.kycStatus,
      aadhaarName: user.aadhaarName,
      aadhaarLast4: user.aadhaarLast4,
      kycVerifiedAt: user.kycVerifiedAt,
      isOwnerEligible: user.kycStatus === KycStatus.VERIFIED,
    };
  }

  async sendAadhaarOtp(userId: string, dto: SubmitAadhaarKycDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (user.kycStatus === KycStatus.VERIFIED) {
      throw new BadRequestException('Aadhaar KYC is already verified');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    kycOtpStore.set(userId, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      aadhaarName: dto.aadhaarName.trim(),
    });

    await this.usersService.updateKycPending(
      userId,
      dto.aadhaarNumber,
      dto.aadhaarName.trim(),
    );

    console.log(
      `[DEV AADHAAR OTP] User: ${userId}, Aadhaar: ****${dto.aadhaarNumber.slice(-4)}, OTP: ${otp}`,
    );

    return {
      message: 'Aadhaar OTP sent to your registered mobile number',
      aadhaarLast4: dto.aadhaarNumber.slice(-4),
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async verifyAadhaarOtp(userId: string, dto: VerifyAadhaarKycDto) {
    const stored = kycOtpStore.get(userId);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('Aadhaar OTP expired or not found');
    }
    if (stored.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid Aadhaar OTP');
    }

    kycOtpStore.delete(userId);

    const user = await this.usersService.verifyKyc(
      userId,
      dto.aadhaarNumber,
      stored.aadhaarName,
    );

    return {
      message: 'Aadhaar KYC verified successfully',
      kycStatus: user.kycStatus,
      aadhaarName: user.aadhaarName,
      aadhaarLast4: user.aadhaarLast4,
      kycVerifiedAt: user.kycVerifiedAt,
    };
  }

  async assertOwnerKyc(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.kycStatus !== KycStatus.VERIFIED) {
      throw new BadRequestException({
        message: 'Aadhaar KYC is required to operate as a charging station owner',
        requiresKyc: true,
        kycStatus: user?.kycStatus ?? KycStatus.NONE,
      });
    }
  }
}
