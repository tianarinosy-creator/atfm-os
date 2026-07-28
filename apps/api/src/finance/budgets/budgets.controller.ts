import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { QueryBudgetsDto } from "./dto/query-budgets.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("finance/budgets")
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(@Query() query: QueryBudgetsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.budgetsService.findAll(query, actor);
  }

  @Post()
  create(@Body() dto: CreateBudgetDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.budgetsService.create(dto, actor);
  }
}
