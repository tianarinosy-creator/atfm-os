import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CapTableService } from "./cap-table.service";
import { CreateShareholderDto } from "./dto/create-shareholder.dto";
import { UpdateValuationDto } from "./dto/update-valuation.dto";
import { QueryCapTableDto } from "./dto/query-cap-table.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("governance/cap-table")
export class CapTableController {
  constructor(private readonly capTableService: CapTableService) {}

  @Get()
  getCapTable(@Query() query: QueryCapTableDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.capTableService.getCapTable(query, actor);
  }

  @Patch("valuation")
  setValuation(@Body() dto: UpdateValuationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.capTableService.setValuation(dto, actor);
  }

  @Post("shareholders")
  addShareholder(@Body() dto: CreateShareholderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.capTableService.addShareholder(dto, actor);
  }

  @Delete("shareholders/:id")
  removeShareholder(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.capTableService.removeShareholder(id, actor);
  }
}
