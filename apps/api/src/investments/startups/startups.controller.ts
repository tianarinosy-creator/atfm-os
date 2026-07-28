import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { StartupsService } from "./startups.service";
import { QueryStartupsDto } from "./dto/query-startups.dto";
import { CreateStartupDto } from "./dto/create-startup.dto";
import { UpdateStartupDto } from "./dto/update-startup.dto";
import { AddDueDiligenceItemDto } from "./dto/add-due-diligence-item.dto";
import { CreateInvestorDto } from "./dto/create-investor.dto";
import { CreateHistoryEventDto } from "./dto/create-history-event.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("investments/startups")
export class StartupsController {
  constructor(private readonly startupsService: StartupsService) {}

  @Get()
  findAll(@Query() query: QueryStartupsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.findAll(query, actor);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.findOne(id, actor);
  }

  @Post()
  create(@Body() dto: CreateStartupDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateStartupDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.update(id, dto, actor);
  }

  @Patch(":id/due-diligence/:itemId/toggle")
  toggleDueDiligenceItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.startupsService.toggleDueDiligenceItem(id, itemId, actor);
  }

  @Post(":id/due-diligence")
  addDueDiligenceItem(
    @Param("id") id: string,
    @Body() dto: AddDueDiligenceItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.startupsService.addDueDiligenceItem(id, dto, actor);
  }

  @Post(":id/investors")
  addInvestor(@Param("id") id: string, @Body() dto: CreateInvestorDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.addInvestor(id, dto, actor);
  }

  @Post(":id/history")
  addHistoryEvent(@Param("id") id: string, @Body() dto: CreateHistoryEventDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.startupsService.addHistoryEvent(id, dto, actor);
  }
}
