import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import {
  RegisterDto,
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { UserRole, KycStatus } from '../common/constants';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

type OtpPurpose = 'verify' | 'reset';

interface StoredOtp {
  otp: string;
  expiresAt: number;
  purpose: OtpPurpose;
}

const otpStore = new Map<string, StoredOtp>();

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private otpKey(email: string, purpose: OtpPurpose) {
    return `${email.toLowerCase()}:${purpose}`;
  }

  private issueToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      walletBalance: user.walletBalance,
      kycStatus: user.kycStatus ?? KycStatus.NONE,
      aadhaarLast4: user.aadhaarLast4,
      aadhaarName: user.aadhaarName,
      kycVerifiedAt: user.kycVerifiedAt,
    };
  }

  private async storeOtp(email: string, purpose: OtpPurpose) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(this.otpKey(email, purpose), {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      purpose,
    });

    const sent = await this.emailService.sendOtpEmail(email, otp, purpose);
    if (!sent) {
      console.log(`[DEV OTP] Email: ${email}, Purpose: ${purpose}, OTP: ${otp}`);
    }

    return otp;
  }

  private validateOtp(email: string, otp: string, purpose: OtpPurpose) {
    const stored = otpStore.get(this.otpKey(email, purpose));
    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('OTP expired or not found');
    }
    if (stored.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    otpStore.delete(this.otpKey(email, purpose));
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.usersService.createWithEmail(
      dto.email,
      dto.password,
      dto.role || UserRole.DRIVER,
    );

    const otp = await this.storeOtp(user.email, 'verify');

    return {
      message: 'Verification code sent to your email',
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      const otp = await this.storeOtp(user.email, 'verify');
      throw new BadRequestException({
        message: 'Email not verified. A new verification code has been sent.',
        email: user.email,
        needsVerification: true,
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
      });
    }

    return this.issueToken(user);
  }

  async sendOtp(dto: SendOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    const otp = await this.storeOtp(user.email, 'verify');

    return {
      message: 'Verification code sent to your email',
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async resendOtp(dto: SendOtpDto) {
    return this.sendOtp(dto);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    this.validateOtp(dto.email, dto.otp, 'verify');

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    if (dto.role && user.role !== dto.role) {
      await this.usersService.update(user.id, { role: dto.role });
      user.role = dto.role;
    }

    if (!user.isVerified) {
      await this.usersService.markVerified(user.id);
      user.isVerified = true;
    }

    return this.issueToken(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    const otp = await this.storeOtp(user.email, 'reset');

    return {
      message: 'Password reset code sent to your email',
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.validateOtp(dto.email, dto.otp, 'reset');

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    await this.usersService.updatePassword(user.id, dto.password);

    return {
      message: 'Password updated successfully',
      email: user.email,
    };
  }

  async switchRole(userId: string, role: UserRole) {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    if (role === UserRole.OWNER) {
      const user = await this.usersService.findById(userId);
      if (!user || user.kycStatus !== KycStatus.VERIFIED) {
        throw new BadRequestException({
          message:
            'Aadhaar KYC is required before you can operate as a charging station owner',
          requiresKyc: true,
          kycStatus: user?.kycStatus ?? KycStatus.NONE,
        });
      }
    }

    const updated = await this.usersService.update(userId, { role });
    return this.toAuthUser(updated);
  }
}
