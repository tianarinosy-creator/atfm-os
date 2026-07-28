import { Controller, Get, Query } from "@nestjs/common";
import { BiService } from "./bi.service";
import { QuerySocietyDto } from "./dto/query-society.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";

@Controller("bi")
export class BiController {
  constructor(private readonly biService: BiService) {}

  @Get("comparison")
  getComparison(@CurrentUser() actor: AuthenticatedUser) {
    return this.biService.getComparison(actor);
  }

  @Get("financial-analysis")
  getFinancialAnalysis(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.biService.getFinancialAnalysis(query.society, actor);
  }

  @Get("commercial-analysis")
  getCommercialAnalysis(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.biService.getCommercialAnalysis(query.society, actor);
  }

  @Get("report")
  getReport(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.biService.getReportSummary(query.society, actor);
  }
}
