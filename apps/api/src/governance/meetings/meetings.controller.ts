import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";
import { QueryMeetingsDto } from "./dto/query-meetings.dto";
import { CreateResolutionDto } from "./dto/create-resolution.dto";
import { UpdateResolutionDto } from "./dto/update-resolution.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("governance/meetings")
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(@Query() query: QueryMeetingsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.findAll(query, actor);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.findOne(id, actor);
  }

  @Post()
  create(@Body() dto: CreateMeetingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMeetingDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.update(id, dto, actor);
  }

  @Post(":id/resolutions")
  addResolution(@Param("id") id: string, @Body() dto: CreateResolutionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.meetingsService.addResolution(id, dto, actor);
  }

  @Patch(":id/resolutions/:resolutionId")
  updateResolution(
    @Param("id") id: string,
    @Param("resolutionId") resolutionId: string,
    @Body() dto: UpdateResolutionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.meetingsService.updateResolution(id, resolutionId, dto, actor);
  }
}
