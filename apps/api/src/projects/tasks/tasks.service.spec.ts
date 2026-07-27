import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

const ASSIGNEE = { personId: "person-1", name: "Léa Fontaine", status: "Actif" };
const PROJECT = { id: "p1", society: "tech", members: [{ personId: "person-1" }] };
const TASK = { id: "t1", projectId: "p1", assigneeId: null, checklist: [], comments: [] };

describe("TasksService", () => {
  let prisma: PrismaMock;
  let directory: DirectoryLookupService;
  let service: TasksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    directory = {
      loadSocietyMembers: jest.fn().mockResolvedValue(new Map([["person-1", ASSIGNEE]])),
      assertActiveMember: jest.fn().mockResolvedValue(undefined),
    } as unknown as DirectoryLookupService;
    service = new TasksService(prisma, directory);
    (prisma.client.project.findUnique as jest.Mock).mockResolvedValue(PROJECT);
  });

  describe("createTask", () => {
    it("refuse un acteur hors société", async () => {
      await expect(
        service.createTask("p1", { title: "Nouvelle tâche" }, actorOf("logistics")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.projectTask.create).not.toHaveBeenCalled();
    });

    it("refuse un assigné qui n'est pas membre de l'équipe du projet", async () => {
      await expect(
        service.createTask("p1", { title: "Nouvelle tâche", assigneeId: "person-hors-equipe" }, actorOf("tech")),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.client.projectTask.create).not.toHaveBeenCalled();
    });

    it("crée la tâche et résout l'assigné depuis le Core Directory", async () => {
      (prisma.client.projectTask.create as jest.Mock).mockResolvedValue({ ...TASK, assigneeId: "person-1" });

      const result = await service.createTask("p1", { title: "Nouvelle tâche", assigneeId: "person-1" }, actorOf("tech"));

      expect(result.assignee).toEqual(ASSIGNEE);
    });
  });

  describe("logTime", () => {
    it("incrémente le temps passé plutôt que de le remplacer", async () => {
      (prisma.client.projectTask.findUnique as jest.Mock).mockResolvedValue(TASK);
      (prisma.client.projectTask.update as jest.Mock).mockResolvedValue({ ...TASK, timeLoggedH: 8 });

      await service.logTime("p1", "t1", { hours: 3 }, actorOf("tech"));

      expect(prisma.client.projectTask.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { timeLoggedH: { increment: 3 } },
        include: expect.anything(),
      });
    });

    it("404 si la tâche n'appartient pas à ce projet", async () => {
      (prisma.client.projectTask.findUnique as jest.Mock).mockResolvedValue({ ...TASK, projectId: "autre-projet" });

      await expect(service.logTime("p1", "t1", { hours: 3 }, actorOf("tech"))).rejects.toThrow(NotFoundException);
    });
  });

  describe("addComment", () => {
    it("l'auteur est toujours l'acteur authentifié, jamais un champ libre", async () => {
      (prisma.client.projectTask.findUnique as jest.Mock).mockResolvedValue(TASK);

      await service.addComment("p1", "t1", { text: "Premier draft partagé." }, actorOf("tech"));

      expect(prisma.client.projectTaskComment.create).toHaveBeenCalledWith({
        data: { taskId: "t1", authorId: "actor-1", text: "Premier draft partagé." },
      });
    });
  });

  describe("checklist", () => {
    it("refuse de modifier un élément qui n'appartient pas à la tâche", async () => {
      (prisma.client.projectTask.findUnique as jest.Mock).mockResolvedValue(TASK);
      (prisma.client.projectTaskChecklistItem.findUnique as jest.Mock).mockResolvedValue({
        id: "item-1",
        taskId: "autre-tache",
      });

      await expect(
        service.updateChecklistItem("p1", "t1", "item-1", { done: true }, actorOf("tech")),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.client.projectTaskChecklistItem.update).not.toHaveBeenCalled();
    });

    it("ajoute un élément puis renvoie la tâche à jour", async () => {
      (prisma.client.projectTask.findUnique as jest.Mock).mockResolvedValue(TASK);

      await service.addChecklistItem("p1", "t1", { text: "Relecture qualité" }, actorOf("tech"));

      expect(prisma.client.projectTaskChecklistItem.create).toHaveBeenCalledWith({
        data: { taskId: "t1", text: "Relecture qualité" },
      });
    });
  });
});
