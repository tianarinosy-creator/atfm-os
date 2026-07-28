import { Controller, Get, Query } from "@nestjs/common";
import { IsString } from "class-validator";
import { MeetingsService } from "../meetings/meetings.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

class QueryDecisionsDto {
  @IsString()
  society!: string;
}

@Controller("governance/decisions")
export class DecisionsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(@Query() query: QueryDecisionsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.findDecisions(query.society, actor);
  }
}
