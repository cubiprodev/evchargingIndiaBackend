import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Charger } from '../chargers/entities/charger.entity';
import {
  UserRole,
  ChargerType,
  ChargerStatus,
} from '../common/constants';

/**
 * Run with: npx ts-node src/database/seed.ts
 * Requires PostgreSQL running via docker-compose
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'evconnect',
    password: process.env.DB_PASSWORD || 'evconnect123',
    database: process.env.DB_NAME || 'evconnect_india',
    entities: [User, Charger],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected. Seeding...');

  const userRepo = dataSource.getRepository(User);
  const chargerRepo = dataSource.getRepository(Charger);

  // Create sample owner
  let owner = await userRepo.findOne({ where: { phone: '9876543210' } });
  if (!owner) {
    owner = userRepo.create({
      phone: '9876543210',
      name: 'Rajesh Kumar',
      role: UserRole.OWNER,
      isVerified: true,
    });
    owner = await userRepo.save(owner);
  }

  // Create sample driver
  let driver = await userRepo.findOne({ where: { phone: '9876543211' } });
  if (!driver) {
    driver = userRepo.create({
      phone: '9876543211',
      name: 'Priya Sharma',
      role: UserRole.DRIVER,
      isVerified: true,
      walletBalance: 500,
    });
    driver = await userRepo.save(driver);
  }

  const sampleChargers = [
    {
      name: 'GreenCharge Delhi Central',
      description: 'Fast charging hub in Connaught Place with 24/7 access',
      latitude: 28.6315,
      longitude: 77.2167,
      address: 'Block A, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      chargerType: ChargerType.CCS2,
      powerKw: 50,
      pricePerKwh: 14,
      status: ChargerStatus.AVAILABLE,
      isFastCharging: true,
      amenities: ['Parking', 'Cafe', 'WiFi', 'Restroom'],
      rating: 4.5,
      totalReviews: 128,
    },
    {
      name: 'Home Charger - Gurgaon Sector 45',
      description: 'Private home charger available evenings and weekends',
      latitude: 28.4595,
      longitude: 77.0266,
      address: 'Tower B, DLF Phase 4',
      city: 'Gurgaon',
      state: 'Haryana',
      chargerType: ChargerType.TYPE2,
      powerKw: 7.4,
      pricePerKwh: 10,
      status: ChargerStatus.AVAILABLE,
      isFastCharging: false,
      amenities: ['Parking'],
      rating: 4.2,
      totalReviews: 34,
    },
    {
      name: 'Taj Hotel EV Station',
      description: 'Premium charging for hotel guests and public',
      latitude: 28.5562,
      longitude: 77.100,
      address: 'Taj Palace, Sardar Patel Marg',
      city: 'New Delhi',
      state: 'Delhi',
      chargerType: ChargerType.TYPE2,
      powerKw: 22,
      pricePerKwh: 16,
      status: ChargerStatus.AVAILABLE,
      isFastCharging: true,
      amenities: ['Parking', 'Restaurant', 'WiFi', 'Valet'],
      rating: 4.8,
      totalReviews: 89,
    },
    {
      name: 'Highway Stop - Delhi-Jaipur',
      description: 'Highway charging stop on NH-48',
      latitude: 28.02,
      longitude: 76.4,
      address: 'KM 45, NH-48',
      city: 'Rewari',
      state: 'Haryana',
      chargerType: ChargerType.BHARAT_DC,
      powerKw: 30,
      pricePerKwh: 12,
      status: ChargerStatus.AVAILABLE,
      isFastCharging: true,
      amenities: ['Parking', 'Food Court', 'Restroom'],
      rating: 4.0,
      totalReviews: 56,
    },
    {
      name: 'Apartment Society Charger',
      description: 'Gated community charger for residents and visitors',
      latitude: 28.5355,
      longitude: 77.391,
      address: 'Prestige Shantiniketan, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      chargerType: ChargerType.AC,
      powerKw: 3.3,
      pricePerKwh: 8,
      status: ChargerStatus.AVAILABLE,
      isFastCharging: false,
      amenities: ['Parking', 'Security'],
      rating: 4.3,
      totalReviews: 21,
    },
  ];

  for (const data of sampleChargers) {
    const exists = await chargerRepo.findOne({ where: { name: data.name } });
    if (!exists) {
      const charger = chargerRepo.create({ ...data, ownerId: owner.id, isActive: true });
      await chargerRepo.save(charger);
      console.log(`Created charger: ${data.name}`);
    }
  }

  console.log('\nSeed complete!');
  console.log('Test accounts:');
  console.log('  Owner:  9876543210');
  console.log('  Driver: 9876543211');
  console.log('  (Use any OTP in dev mode - check server logs)');

  await dataSource.destroy();
}

seed().catch(console.error);
