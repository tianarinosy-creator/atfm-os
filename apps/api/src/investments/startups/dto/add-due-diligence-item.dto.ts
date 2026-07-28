import { IsString, MinLength } from "class-validator";

export class AddDueDiligenceItemDto {
  @IsString()
  @MinLength(1)
  text!: string;
}
