import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PeopleService } from "./people.service";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { TransferAffectationDto } from "./dto/transfer-affectation.dto";
import { UpdateAffectationStatusDto } from "./dto/update-affectation-status.dto";
import { QueryPeopleDto } from "./dto/query-people.dto";
import { RequireRole } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";

@Controller("people")
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  findAll(@Query() query: QueryPeopleDto) {
    return this.peopleService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.peopleService.findOne(id);
  }

  @Post()
  @RequireRole("RH")
  create(@Body() dto: CreatePersonDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.peopleService.create(dto, actor);
  }

  @Patch(":id")
  @RequireRole("RH")
  update(@Param("id") id: string, @Body() dto: UpdatePersonDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.peopleService.update(id, dto, actor);
  }

  @Post(":id/affectations")
  @RequireRole("RH")
  transfer(@Param("id") id: string, @Body() dto: TransferAffectationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.peopleService.transfer(id, dto, actor);
  }

  @Patch(":id/affectations/:affectationId")
  @RequireRole("RH")
  updateAffectationStatus(
    @Param("id") id: string,
    @Param("affectationId") affectationId: string,
    @Body() dto: UpdateAffectationStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.peopleService.updateAffectationStatus(id, affectationId, dto, actor);
  }
}
