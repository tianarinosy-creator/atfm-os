import { Body, Controller, Get, Patch, Query } from "@nestjs/common";
import { MappingService } from "./mapping.service";
import { UpdateMappingDto } from "./dto/update-mapping.dto";
import { QuerySocietyDto } from "../dto/query-society.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../auth/auth.types";

@Controller("integrations/odoo/mapping")
export class MappingController {
  constructor(private readonly mappingService: MappingService) {}

  @Get()
  getMapping(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.mappingService.getMapping(query.society, actor);
  }

  @Patch()
  updateField(@Query() query: QuerySocietyDto, @Body() dto: UpdateMappingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.mappingService.updateField(query.society, dto, actor);
  }
}
