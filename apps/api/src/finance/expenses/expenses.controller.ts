import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { QueryExpensesDto } from "./dto/query-expenses.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("finance/expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(@Query() query: QueryExpensesDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.expensesService.findAll(query, actor);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.expensesService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.expensesService.update(id, dto, actor);
  }
}
