import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GeocodedAddress = {
  address: string;
  city: string;
  state: string;
  formattedAddress: string;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

@Injectable()
export class GeocodingService {
  constructor(private configService: ConfigService) {}

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodedAddress> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('Google Maps API key is not configured');
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${latitude},${longitude}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      throw new BadRequestException(
        data.error_message || 'Could not resolve address for this location',
      );
    }

    const result = data.results[0];
    const components: AddressComponent[] = result.address_components;
    const get = (...types: string[]) =>
      components.find((c) => types.some((t) => c.types.includes(t)));

    const streetNumber = get('street_number')?.long_name ?? '';
    const route = get('route')?.long_name ?? '';
    const sublocality =
      get('sublocality', 'sublocality_level_1', 'neighborhood')?.long_name ??
      '';
    const city =
      get('locality')?.long_name ||
      get('administrative_area_level_2')?.long_name ||
      get('sublocality_level_2')?.long_name ||
      '';
    const state = get('administrative_area_level_1')?.long_name ?? '';

    const streetLine = [streetNumber, route].filter(Boolean).join(' ').trim();
    const address =
      streetLine || sublocality || result.formatted_address.split(',')[0]?.trim();

    return {
      address,
      city,
      state,
      formattedAddress: result.formatted_address,
    };
  }
}
