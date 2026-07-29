import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ConnectionService } from "./connection.service";
import { UpsertConnectionDto } from "./dto/upsert-connection.dto";
import { QuerySocietyDto } from "../dto/query-society.dto";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../auth/auth.types";

@Controller("integrations/odoo/connection")
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post()
  connect(@Body() dto: UpsertConnectionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.connectionService.testAndStore(dto, actor);
  }

  @Get()
  getStatus(@Query() query: QuerySocietyDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.connectionService.getStatus(query.society, actor);
  }
}
