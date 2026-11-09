import { ExtractResponse } from '@/common/constants/constant';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExtractService {
  private readonly scraperUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.scraperUrl =
      this.configService.get<string>('SCRAPER_SERVICE_URL') ||
      'http://localhost:8000';
  }

  async extractMovie(
    code?: string,
    trailerUrl?: string,
  ): Promise<ExtractResponse> {
    try {
      const response = await fetch(`${this.scraperUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code || null,
          trailer_url: trailerUrl || null,
        }),
      });

      if (!response.ok) {
        let errMessage = `Error ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.detail || errData.message || errMessage;
        } catch {}
        throw new HttpException(errMessage, response.status);
      }

      const data = await response.json();

      const formatUrl = (urlStr?: string) => {
        if (!urlStr) return '';
        if (urlStr.startsWith('/')) {
          return `${this.scraperUrl}${urlStr}`;
        }
        return urlStr;
      };

      const result: ExtractResponse = {
        code: data.code || code || '',
        title: data.title || '',
        overview: data.overview || '',
        director: data.director || '',
        studio: data.studio || '',
        label: data.label || '',
        country: data.country || 'Japan',
        language: data.language || 'Japanese',
        release_date: data.release_date || '',
        cast: data.cast || '',
        genres: data.genres || '',
        series: data.series || '',
        runtime_minutes: data.runtime_minutes || 0,
        rating: data.rating || 0,
        cover_url: formatUrl(data.cover_url),
        gallery_urls: Array.isArray(data.gallery_urls)
          ? data.gallery_urls.map((g: string) => formatUrl(g))
          : [],
        trailer_url: data.trailer_url ? formatUrl(data.trailer_url) : undefined,
      };

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch data from scraper: ${error.message || 'Unknown error'}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
