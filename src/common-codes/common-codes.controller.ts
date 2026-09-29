import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CommonCodesService } from './common-codes.service';
import {
  CreateCodeTypeDto,
  UpdateCodeTypeDto,
  CreateCodeDetailDto,
  UpdateCodeDetailDto,
} from './dto/common-code.dto';

@Controller('common-codes')
export class CommonCodesController {
  constructor(private readonly commonCodesService: CommonCodesService) {}

  @Post()
  createType(@Body() dto: CreateCodeTypeDto) {
    return this.commonCodesService.createType(dto);
  }

  @Get()
  findAllTypes() {
    return this.commonCodesService.findAllTypes();
  }

  @Get(':id')
  findOneType(@Param('id') id: string) {
    return this.commonCodesService.findOneType(id);
  }

  @Patch(':id')
  updateType(@Param('id') id: string, @Body() dto: UpdateCodeTypeDto) {
    return this.commonCodesService.updateType(id, dto);
  }

  @Delete(':id')
  removeType(@Param('id') id: string) {
    return this.commonCodesService.removeType(id);
  }

  // Code Details
  @Post(':code/details')
  createDetail(@Param('code') code: string, @Body() dto: CreateCodeDetailDto) {
    return this.commonCodesService.createDetail(code, dto);
  }

  @Get(':code/details')
  findAllDetails(@Param('code') code: string) {
    return this.commonCodesService.findAllDetails(code);
  }

  @Patch('details/:id')
  updateDetail(@Param('id') id: string, @Body() dto: UpdateCodeDetailDto) {
    return this.commonCodesService.updateDetail(id, dto);
  }

  @Delete('details/:id')
  removeDetail(@Param('id') id: string) {
    return this.commonCodesService.removeDetail(id);
  }
}
