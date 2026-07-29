import { Module } from "@nestjs/common";
import { DirectoryModule } from "../directory/directory.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";

@Module({
  imports: [DirectoryModule],
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, TasksService],
  exports: [ProjectsService, TasksService],
})
export class ProjectsModule {}
