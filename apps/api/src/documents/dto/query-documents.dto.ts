import { IsBooleanString, IsEnum, IsOptional, IsString } from "class-validator";
import { DocumentCategory } from "@atfm/db";

export class QueryDocumentsDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  // "false" par défaut côté service, comme showArchived du prototype.
  @IsOptional()
  @IsBooleanString()
  archived?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
