import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PeopleModule } from "./people/people.module";
import { EventsModule } from "./events/events.module";
import { CrmModule } from "./crm/crm.module";
import { ProjectsModule } from "./projects/projects.module";
import { FinanceModule } from "./finance/finance.module";
import { GovernanceModule } from "./governance/governance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PeopleModule,
    EventsModule,
    CrmModule,
    ProjectsModule,
    FinanceModule,
    GovernanceModule,
  ],
})
export class AppModule {}
