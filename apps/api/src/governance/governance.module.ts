import { Module } from "@nestjs/common";
import { BoardController } from "./board/board.controller";
import { BoardService } from "./board/board.service";
import { CapTableController } from "./cap-table/cap-table.controller";
import { CapTableService } from "./cap-table/cap-table.service";
import { MeetingsController } from "./meetings/meetings.controller";
import { MeetingsService } from "./meetings/meetings.service";
import { DecisionsController } from "./decisions/decisions.controller";

@Module({
  controllers: [BoardController, CapTableController, MeetingsController, DecisionsController],
  providers: [BoardService, CapTableService, MeetingsService],
})
export class GovernanceModule {}
