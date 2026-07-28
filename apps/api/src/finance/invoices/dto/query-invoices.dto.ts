import { IsIn, IsOptional, IsString } from "class-validator";
import { INVOICE_STATUSES } from "../../finance.constants";

export class QueryInvoicesDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];
}
