import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractResponse } from 'lib/constant';

@Injectable()
export class ExtractService {
  private readonly javinfoUrl = 'https://api.javinfo.dev/movie';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('JAVINFO_KEY') ||
      'jvi_vRizDyjmXwdMMhNSHqMiWVvLbxMxerXaayTRrKBYZUThrsCtUKyYcKiCBnFOsZuP';
  }

  async extractMovie(code: string): Promise<ExtractResponse> {
    const headers = {
      'x-javinfo-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    const payload = {
      q: code,
      providers: 'javlibrary',
    };

    try {
      const response = await fetch(this.javinfoUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Error ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.message || errMessage;
        } catch {}
        throw new HttpException(errMessage, response.status);
      }

      const data = await response.json();
      const movieData = data.result;

      if (!movieData) {
        throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
      }

      const coverUrl =
        movieData.jacketFullUrl || movieData.jacketThumbUrl || '';
      const galleryUrls =
        movieData.extra?.galleryFull || movieData.extra?.galleryThumb || [];

      const result: ExtractResponse = {
        code: movieData.dvdId || code,
        title: movieData.titleEn || movieData.titleJa || '',
        overview: movieData.commentEn || movieData.commentJa || '',
        director: (movieData.directors || []).join(', '),
        studio: (movieData.makers || []).join(', '),
        label: movieData.label || '',
        country: 'Japan',
        language: 'Japanese',
        release_date: movieData.releaseDate || '',
        cast: [
          ...(movieData.actresses || []),
          ...(movieData.actors || []),
        ].join(', '),
        genres: (movieData.categories || []).join(', '),
        series: movieData.series || '',
        runtime_minutes: movieData.runtimeMins || 0,
        rating: movieData.extra?.rating || 0,
        cover_url: coverUrl,
        gallery_urls: galleryUrls,
      };

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch data: ${error.message || 'Unknown error'}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
