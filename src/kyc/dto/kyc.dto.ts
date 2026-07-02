import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class SubmitAadhaarKycDto {
  @IsString()
  @Matches(/^[2-9]\d{11}$/, { message: 'Enter a valid 12-digit Aadhaar number' })
  aadhaarNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  aadhaarName: string;
}

export class VerifyAadhaarKycDto {
  @IsString()
  @Matches(/^[2-9]\d{11}$/, { message: 'Enter a valid 12-digit Aadhaar number' })
  aadhaarNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
