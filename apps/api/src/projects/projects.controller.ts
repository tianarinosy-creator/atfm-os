import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { QueryProjectsDto } from "./dto/query-projects.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { CreateRiskDto } from "./dto/create-risk.dto";
import { UpdateRiskDto } from "./dto/update-risk.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Query() query: QueryProjectsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.findAll(query, actor);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.findOne(id, actor);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.update(id, dto, actor);
  }

  @Post(":id/members")
  addMember(@Param("id") id: string, @Body() dto: AddMemberDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.addMember(id, dto, actor);
  }

  @Delete(":id/members/:personId")
  removeMember(@Param("id") id: string, @Param("personId") personId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.removeMember(id, personId, actor);
  }

  @Post(":id/expenses")
  addExpense(@Param("id") id: string, @Body() dto: CreateExpenseDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.addExpense(id, dto, actor);
  }

  @Post(":id/risks")
  addRisk(@Param("id") id: string, @Body() dto: CreateRiskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.projectsService.addRisk(id, dto, actor);
  }

  @Patch(":id/risks/:riskId")
  updateRiskStatus(
    @Param("id") id: string,
    @Param("riskId") riskId: string,
    @Body() dto: UpdateRiskDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.projectsService.updateRiskStatus(id, riskId, dto, actor);
  }
}
