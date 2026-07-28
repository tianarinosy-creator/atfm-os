import { Controller, Get } from "@nestjs/common";
import { StartupsService } from "../startups/startups.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("investments/portfolio")
export class PortfolioController {
  constructor(private readonly startupsService: StartupsService) {}

  @Get()
  getPortfolio(@CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.getPortfolio(actor);
  }
}
