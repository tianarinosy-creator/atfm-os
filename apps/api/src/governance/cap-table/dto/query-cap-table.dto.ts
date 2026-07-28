import { IsString } from "class-validator";

export class QueryCapTableDto {
  @IsString()
  society!: string;
}
