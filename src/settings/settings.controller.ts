import { Controller, Post, HttpCode, Get, Delete } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('reset')
  @HttpCode(200)
  async resetData() {
    return this.settingsService.resetData();
  }

  @Get('logs')
  async getLogs() {
    return this.settingsService.getLogs();
  }

  @Delete('logs')
  @HttpCode(200)
  async clearLogs() {
    return this.settingsService.clearLogs();
  }
}
