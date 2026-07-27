import { IsIn } from "class-validator";
import { RISK_STATUSES } from "../projects.constants";

export class UpdateRiskDto {
  @IsIn(RISK_STATUSES)
  status!: (typeof RISK_STATUSES)[number];
}
