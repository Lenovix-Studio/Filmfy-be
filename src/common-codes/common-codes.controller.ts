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

  // API Create Common code type
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

  // API Update Common code type
  @Patch(':id')
  updateType(@Param('id') id: string, @Body() dto: UpdateCodeTypeDto) {
    return this.commonCodesService.updateType(id, dto);
  }

  // API Delete Common code type
  @Delete(':id')
  removeType(@Param('id') id: string) {
    return this.commonCodesService.removeType(id);
  }

  // API Create Common code detail type
  @Post(':code/details')
  createDetail(@Param('code') code: string, @Body() dto: CreateCodeDetailDto) {
    return this.commonCodesService.createDetail(code, dto);
  }

  @Get(':code/details')
  findAllDetails(@Param('code') code: string) {
    return this.commonCodesService.findAllDetails(code);
  }

  // API Update Common code detail type
  @Patch('details/:id')
  updateDetail(@Param('id') id: string, @Body() dto: UpdateCodeDetailDto) {
    return this.commonCodesService.updateDetail(id, dto);
  }

  // API Delete Common code detail type
  @Delete('details/:id')
  removeDetail(@Param('id') id: string) {
    return this.commonCodesService.removeDetail(id);
  }
}
