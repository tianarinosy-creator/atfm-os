import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Currency } from "@atfm/db";
import { CURRENCIES, INVOICE_STATUSES } from "../../finance.constants";

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  client?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
