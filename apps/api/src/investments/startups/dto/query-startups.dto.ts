import { IsOptional, IsString } from "class-validator";

export class QueryStartupsDto {
  @IsOptional()
  @IsString()
  search?: string;
}
