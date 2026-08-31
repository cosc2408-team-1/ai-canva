import { describe, expect, it } from "vitest";
import { CODE_LENGTH, MAX_TEAM_MEMBERS, buildTeamBoard, generateWorkshopCode } from "./workshop.js";
import type { BoardDoc } from "./firestore.js";

const template: BoardDoc = {
  id: "tpl-1",
  title: "Workshop Template",
  ownerId: "facil-1",
  ownerEmail: "f@x.co",
  collaborators: ["friend@x.co"],
  nodes: [{ id: "n1", type: "idea", position: { x: 0, y: 0 } } as never],
  edges: [],
  boxData: { n1: { content: "hello", prompt: "", systemPrompt: "", output: "", status: "idle" } },
  createdAt: 1,
  updatedAt: 2,
};

describe("generateWorkshopCode", () => {
  it("generates 8-char codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateWorkshopCode();
      expect(c).toHaveLength(CODE_LENGTH);
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/); // no I, O, 0, 1
    }
  });

  it("generates (effectively) unique codes", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateWorkshopCode()));
    expect(seen.size).toBeGreaterThan(190);
  });
});

describe("buildTeamBoard", () => {
  it("copies content but resets ownership, sharing, and template flags", () => {
    const board = buildTeamBoard(template, {
      id: "team-board-1",
      title: "Workshop — Team A",
      teamId: "team-1",
      facilitatorUid: "facil-2",
      facilitatorEmail: "facil2@x.co",
    });
    expect(board.id).toBe("team-board-1");
    expect(board.title).toBe("Workshop — Team A");
    expect(board.ownerId).toBe("facil-2");
    expect(board.collaborators).toEqual([]);
    expect(board.memberUids).toEqual([]);
    expect(board.isTemplate).toBe(false);
    expect(board.teamId).toBe("team-1");
    // content copied verbatim
    expect(board.nodes).toEqual(template.nodes);
    expect(board.boxData).toEqual(template.boxData);
    expect(board.createdAt).toBeGreaterThan(template.createdAt);
  });
});

describe("capacity constant", () => {
  it("caps teams at 5 members", () => {
    expect(MAX_TEAM_MEMBERS).toBe(5);
  });
});
