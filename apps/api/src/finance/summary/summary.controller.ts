import { Controller, Get, Query } from "@nestjs/common";
import { SummaryService } from "./summary.service";
import { QuerySummaryDto } from "./summary.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("finance/summary")
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  getSummary(@Query() query: QuerySummaryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.summaryService.getSummary(query.society, actor);
  }
}
