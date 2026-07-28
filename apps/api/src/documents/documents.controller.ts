import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { QueryDocumentsDto } from "./dto/query-documents.dto";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query() query: QueryDocumentsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.findAll(query, actor);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.create(dto, actor);
  }

  @Patch(":id/new-version")
  newVersion(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.newVersion(id, actor);
  }

  @Patch(":id/archive-toggle")
  toggleArchive(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.toggleArchive(id, actor);
  }

  @Patch(":id/signature-toggle")
  toggleSignature(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.toggleSignature(id, actor);
  }

  @Patch(":id/cycle-permission")
  cyclePermission(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.cyclePermission(id, actor);
  }
}
