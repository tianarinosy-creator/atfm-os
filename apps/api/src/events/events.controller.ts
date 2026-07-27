import { Controller, Get, Query } from "@nestjs/common";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findRecent(@Query("limit") limit?: string) {
    return this.eventsService.findRecent(limit ? Number(limit) : undefined);
  }
}
