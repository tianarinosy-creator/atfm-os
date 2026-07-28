import { IsEnum, IsString, MinLength } from "class-validator";
import { BoardRole } from "@atfm/db";

export class CreateBoardMemberDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(BoardRole)
  role!: BoardRole;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  since!: string;
}
