import { Controller, Post, HttpCode, Get, Delete, Body } from '@nestjs/common';
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

  @Post('logs')
  @HttpCode(200)
  async createLog(@Body() body: { level: string; message: string; source?: string }) {
    return this.settingsService.createLog(body);
  }

  @Delete('logs')
  @HttpCode(200)
  async clearLogs() {
    return this.settingsService.clearLogs();
  }
}
