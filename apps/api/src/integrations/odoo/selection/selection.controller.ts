import { Body, Controller, Patch, Query } from "@nestjs/common";
import { SelectionService } from "./selection.service";
import { SelectModulesDto } from "./dto/select-modules.dto";
import { QuerySocietyDto } from "../dto/query-society.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../auth/auth.types";

@Controller("integrations/odoo/selection")
export class SelectionController {
  constructor(private readonly selectionService: SelectionService) {}

  @Patch()
  setSelected(@Query() query: QuerySocietyDto, @Body() dto: SelectModulesDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.selectionService.setSelected(query.society, dto, actor);
  }
}
