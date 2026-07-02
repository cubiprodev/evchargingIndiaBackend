import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitAadhaarKycDto, VerifyAadhaarKycDto } from './dto/kyc.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  getStatus(@Request() req: { user: { id: string } }) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('aadhaar/send-otp')
  sendAadhaarOtp(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitAadhaarKycDto,
  ) {
    return this.kycService.sendAadhaarOtp(req.user.id, dto);
  }

  @Post('aadhaar/verify-otp')
  verifyAadhaarOtp(
    @Request() req: { user: { id: string } },
    @Body() dto: VerifyAadhaarKycDto,
  ) {
    return this.kycService.verifyAadhaarOtp(req.user.id, dto);
  }
}
