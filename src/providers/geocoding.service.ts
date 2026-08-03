import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 3.6 V3 : geocode une adresse via l'API Google Geocoding, pour la carte interactive
 * des intervenants. Si aucune cle n'est configuree, se degrade silencieusement (pas de
 * coordonnees) plutot que de bloquer la creation/modification d'un intervenant —
 * meme principe que FcmService pour les notifications push.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async geocodeAddress(address: string): Promise<Coordinates | null> {
    const apiKey = this.configService.get('googleMaps', { infer: true }).apiKey;
    if (!apiKey) {
      return null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', address);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        this.logger.warn(
          `Geocodage echoue (HTTP ${response.status}) pour "${address}"`,
        );
        return null;
      }
      const data = (await response.json()) as {
        status: string;
        results: { geometry: { location: { lat: number; lng: number } } }[];
      };
      if (data.status !== 'OK' || data.results.length === 0) {
        this.logger.warn(
          `Geocodage sans resultat ("${data.status}") pour "${address}"`,
        );
        return null;
      }
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    } catch (error) {
      this.logger.warn(
        `Geocodage en erreur pour "${address}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
