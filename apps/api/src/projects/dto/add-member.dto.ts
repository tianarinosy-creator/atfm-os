import { IsUUID } from "class-validator";

export class AddMemberDto {
  @IsUUID()
  personId!: string;
}
