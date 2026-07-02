import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type OtpEmailPurpose = 'verify' | 'reset';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {}

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    purpose: OtpEmailPurpose,
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER');

    const subject =
      purpose === 'verify'
        ? 'Verify your EVConnect India account'
        : 'Reset your EVConnect India password';

    const intro =
      purpose === 'verify'
        ? 'Use this code to verify your email address:'
        : 'Use this code to reset your password:';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #00A651;">EVConnect India</h2>
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1A1A2E;">${otp}</p>
        <p style="color: #6B7280;">This code expires in 5 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `;

    if (!transporter || !from) {
      this.logger.warn(
        `SMTP not configured — OTP for ${to} (${purpose}): ${otp}`,
      );
      return false;
    }

    try {
      await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`OTP email sent to ${to} (${purpose})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      return false;
    }
  }
}
