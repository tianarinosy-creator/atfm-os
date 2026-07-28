import { IsString } from "class-validator";

export class QueryBoardDto {
  @IsString()
  society!: string;
}
