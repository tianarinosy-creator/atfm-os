import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Currency } from "@atfm/db";
import { CURRENCIES } from "../../finance.constants";

export class CreateInvoiceDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  client!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsIn(CURRENCIES)
  currency!: Currency;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
