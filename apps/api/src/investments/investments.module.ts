import { Module } from "@nestjs/common";
import { StartupsController } from "./startups/startups.controller";
import { StartupsService } from "./startups/startups.service";
import { PortfolioController } from "./portfolio/portfolio.controller";
import { InvestorsController } from "./investors/investors.controller";
import { HistoryController } from "./history/history.controller";

@Module({
  controllers: [StartupsController, PortfolioController, InvestorsController, HistoryController],
  providers: [StartupsService],
})
export class InvestmentsModule {}
