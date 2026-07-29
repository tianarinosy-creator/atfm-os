import { Controller, Get, Post, Query } from "@nestjs/common";
import { ImportService } from "./import.service";
import { QuerySocietyDto } from "../dto/query-society.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../auth/auth.types";

@Controller("integrations/odoo")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("import")
  runImport(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.importService.runImport(query.society, actor);
  }

  @Get("report")
  getReports(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.importService.getReports(query.society, actor);
  }
}
