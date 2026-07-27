import { Controller, Get, Query } from "@nestjs/common";
import { IsString } from "class-validator";
import { DealsService } from "./deals.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

class QueryContractsDto {
  @IsString()
  society!: string;
}

/// "Contrats" n'est pas une table à part : une vue dérivée du pipeline (voir
/// ContractsView du prototype — affaires en négociation ou gagnées).
@Controller("crm/contracts")
export class ContractsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll(@Query() query: QueryContractsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.findContracts(query.society, actor);
  }
}
