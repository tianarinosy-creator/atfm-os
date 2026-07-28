import { Controller, Get } from "@nestjs/common";
import { StartupsService } from "../startups/startups.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("investments/investors")
export class InvestorsController {
  constructor(private readonly startupsService: StartupsService) {}

  @Get()
  getInvestors(@CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.getInvestors(actor);
  }
}
