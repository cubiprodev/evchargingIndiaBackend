import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, KycStatus } from '../common/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = this.usersRepository.createQueryBuilder('user').where(
      'LOWER(user.email) = LOWER(:email)',
      { email },
    );

    if (includePassword) {
      query.addSelect('user.passwordHash');
    }

    return query.getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIdWithAadhaar(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.aadhaarHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateKycPending(
    id: string,
    aadhaarNumber: string,
    aadhaarName: string,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.aadhaarHash = await bcrypt.hash(aadhaarNumber, 10);
    user.aadhaarLast4 = aadhaarNumber.slice(-4);
    user.aadhaarName = aadhaarName;
    user.kycStatus = KycStatus.PENDING;
    return this.usersRepository.save(user);
  }

  async verifyKyc(
    id: string,
    aadhaarNumber: string,
    aadhaarName: string,
  ): Promise<User> {
    const user = await this.findByIdWithAadhaar(id);
    if (!user?.aadhaarHash) {
      throw new NotFoundException('KYC submission not found');
    }

    const matches = await bcrypt.compare(aadhaarNumber, user.aadhaarHash);
    if (!matches) {
      throw new NotFoundException('Aadhaar number does not match submitted details');
    }

    user.kycStatus = KycStatus.VERIFIED;
    user.aadhaarName = aadhaarName;
    user.kycVerifiedAt = new Date();
    return this.usersRepository.save(user);
  }

  async create(phone: string, role: UserRole = UserRole.DRIVER): Promise<User> {
    const user = this.usersRepository.create({ phone, role });
    return this.usersRepository.save(user);
  }

  async createWithEmail(
    email: string,
    password: string,
    role: UserRole = UserRole.DRIVER,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      isVerified: false,
    });
    return this.usersRepository.save(user);
  }

  async updatePassword(id: string, password: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.passwordHash = await bcrypt.hash(password, 10);
    return this.usersRepository.save(user);
  }

  async markVerified(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.isVerified = true;
    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async addToWallet(id: string, amount: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.walletBalance = Number(user.walletBalance) + amount;
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }
}
