import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { QueryDealsDto } from "./dto/query-deals.dto";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("crm/deals")
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll(@Query() query: QueryDealsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.findAll(query, actor);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.findOne(id, actor);
  }

  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDealDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.update(id, dto, actor);
  }

  @Post(":id/activities")
  addActivity(@Param("id") id: string, @Body() dto: CreateActivityDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.dealsService.addActivity(id, dto, actor);
  }
}
