import { IsBoolean } from "class-validator";

export class UpdateChecklistItemDto {
  @IsBoolean()
  done!: boolean;
}
