import { Controller, Post, HttpCode } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('reset')
  @HttpCode(200)
  async resetData() {
    return this.settingsService.resetData();
  }
}
