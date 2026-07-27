import { IsOptional, IsString } from "class-validator";

export class QueryContactsDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsString()
  search?: string;
}
