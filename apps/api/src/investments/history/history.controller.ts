import { Controller, Get } from "@nestjs/common";
import { StartupsService } from "../startups/startups.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("investments/history")
export class HistoryController {
  constructor(private readonly startupsService: StartupsService) {}

  @Get()
  getHistory(@CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.getHistory(actor);
  }
}
