import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PeopleModule } from "./people/people.module";
import { EventsModule } from "./events/events.module";
import { CrmModule } from "./crm/crm.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PeopleModule,
    EventsModule,
    CrmModule,
  ],
})
export class AppModule {}
