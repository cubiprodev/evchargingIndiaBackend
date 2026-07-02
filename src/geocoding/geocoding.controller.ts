import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';
import { Public } from '../common/decorators';

@ApiTags('Geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Public()
  @Get('reverse')
  async reverse(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new BadRequestException('Valid lat and lng are required');
    }

    try {
      return await this.geocodingService.reverseGeocode(latitude, longitude);
    } catch {
      throw new BadRequestException('Could not resolve address for this location');
    }
  }
}
