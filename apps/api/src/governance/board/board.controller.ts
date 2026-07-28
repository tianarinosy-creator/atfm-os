import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { BoardService } from "./board.service";
import { CreateBoardMemberDto } from "./dto/create-board-member.dto";
import { QueryBoardDto } from "./dto/query-board.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("governance/board")
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  findAll(@Query() query: QueryBoardDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.boardService.findAll(query, actor);
  }

  @Post()
  create(@Body() dto: CreateBoardMemberDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.boardService.create(dto, actor);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.boardService.remove(id, actor);
  }
}
