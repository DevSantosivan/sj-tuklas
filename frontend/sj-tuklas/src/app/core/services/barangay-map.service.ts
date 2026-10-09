import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BarangayMapService {
  private readonly apiUrl =
    'https://fmbfsd.denr.gov.ph/server/rest/services/Hosted/INREMP_GDSS/FeatureServer/38/query';

  constructor(private http: HttpClient) {}

  getBarangayBoundaries(): Observable<unknown> {
    return this.http.get(this.apiUrl, {
      params: {
        where: '1=1',
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4326',
        f: 'geojson',
      },
    });
  }
}
