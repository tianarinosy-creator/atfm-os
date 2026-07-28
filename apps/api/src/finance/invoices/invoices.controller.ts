import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { QueryInvoicesDto } from "./dto/query-invoices.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("finance/invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() query: QueryInvoicesDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoicesService.findAll(query, actor);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoicesService.create(dto, actor);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateInvoiceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.invoicesService.update(id, dto, actor);
  }
}
