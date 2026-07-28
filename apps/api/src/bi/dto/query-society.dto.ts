import { IsString } from "class-validator";

export class QuerySocietyDto {
  @IsString()
  society!: string;
}
