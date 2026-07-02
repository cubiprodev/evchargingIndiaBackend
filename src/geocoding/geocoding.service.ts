import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GeocodedAddress = {
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

type NominatimAddress = {
  road?: string;
  residential?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
};

@Injectable()
export class GeocodingService {
  constructor(private configService: ConfigService) {}

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodedAddress> {
    const googleResult = await this.reverseGeocodeGoogle(latitude, longitude);
    if (googleResult) return googleResult;

    const osmResult = await this.reverseGeocodeNominatim(latitude, longitude);
    if (osmResult) return osmResult;

    throw new Error('Could not resolve address for this location');
  }

  private async reverseGeocodeGoogle(
    latitude: number,
    longitude: number,
  ): Promise<GeocodedAddress | null> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${latitude},${longitude}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) return null;

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
        streetLine ||
        sublocality ||
        result.formatted_address.split(',')[0]?.trim();

      return {
        address,
        city,
        state,
        formattedAddress: result.formatted_address,
      };
    } catch {
      return null;
    }
  }

  private async reverseGeocodeNominatim(
    latitude: number,
    longitude: number,
  ): Promise<GeocodedAddress | null> {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'EVConnectIndia/1.0 (contact@evconnect.in)' },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const addr: NominatimAddress = data.address ?? {};

      const streetParts = [
        addr.road,
        addr.residential,
        addr.neighbourhood,
        addr.suburb,
      ].filter(Boolean);

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        addr.suburb ||
        '';

      const state = addr.state ?? '';
      const address =
        streetParts.join(', ') ||
        data.display_name?.split(',')[0]?.trim() ||
        '';

      if (!address && !city && !state) return null;

      return {
        address,
        city,
        state,
        formattedAddress: data.display_name ?? [address, city, state].join(', '),
      };
    } catch {
      return null;
    }
  }
}
