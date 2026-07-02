import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'evconnect',
  password: process.env.DB_PASSWORD || 'evconnect123',
  database: process.env.DB_NAME || 'evconnect_india',
}));
