import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";
import { QueryContactsDto } from "./dto/query-contacts.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("crm/contacts")
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@Query() query: QueryContactsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.contactsService.findAll(query, actor);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.contactsService.findOne(id, actor);
  }

  @Post()
  create(@Body() dto: CreateContactDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.contactsService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateContactDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.contactsService.update(id, dto, actor);
  }
}
