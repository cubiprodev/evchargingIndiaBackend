export const PLATFORM_FEE_PER_KWH = 2; // ₹2 per kWh platform fee

export enum UserRole {
  DRIVER = 'driver',
  OWNER = 'owner',
  ADMIN = 'admin',
}

export enum ChargerType {
  CCS2 = 'CCS2',
  TYPE2 = 'Type 2',
  BHARAT_DC = 'Bharat DC',
  AC = 'AC',
}

export enum ChargerStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  OCCUPIED_SOON = 'occupied_soon',
  BUSY = 'busy',
  PAUSED = 'paused',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  AT_STATION = 'at_station',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum BookingRequestType {
  DIRECT = 'direct',
  BROADCAST = 'broadcast',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  UPI = 'upi',
  CARD = 'card',
  WALLET = 'wallet',
}

export enum KycStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}
