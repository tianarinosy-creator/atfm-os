import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { BoardService } from "./board.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("BoardService", () => {
  let prisma: PrismaMock;
  let service: BoardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new BoardService(prisma);
  });

  describe("findAll", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("refuse un acteur hors société", async () => {
      await expect(
        service.create({ society: "logistics", name: "Karim Fassi", role: "presidence" as any, title: "Président", since: "2024" }, actorOf("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.boardMember.create).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("404 si le membre n'existe pas", async () => {
      (prisma.client.boardMember.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove("missing", actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société du membre", async () => {
      (prisma.client.boardMember.findUnique as jest.Mock).mockResolvedValue({ id: "bm1", society: "logistics" });

      await expect(service.remove("bm1", actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.boardMember.delete).not.toHaveBeenCalled();
    });
  });
});
