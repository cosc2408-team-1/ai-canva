// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { User } from "firebase/auth";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import Header from "./Header.js";

const mocks = vi.hoisted(() => ({
  docx: vi.fn(),
  state: { currentBoardId: "local-test", boardTitle: "Portal", saveStatus: "saved", boardList: [],
    refreshBoardList: vi.fn(), setBoardTitle: vi.fn(),
    nodes: [{ id: "asset", type: "assetmapper", position: { x: 0, y: 0 }, data: { boxType: "assetmapper", title: "Assets" } }],
    boxData: { asset: { output: "artifact_type: AssetPackage\nschema_version: '1.0'\nstatus: complete\nassets: []\nevidence_register: []\nopen_questions: []", content: "", status: "done", prompt: "", systemPrompt: "" } },
  },
}));
vi.mock("../store/boardStore.js", () => ({ useBoardStore: Object.assign((select: (state: typeof mocks.state) => unknown) => select(mocks.state), { getState: () => mocks.state }) }));
vi.mock("../store/tokenStore.js", () => ({ useTokenStore: (select: (state: { totalTokens: number }) => unknown) => select({ totalTokens: 0 }) }));
vi.mock("./PresenceRoster.js", () => ({ default: () => null }));
vi.mock("../lib/securityReviewDocx.js", () => ({ downloadSecurityReviewDocx: mocks.docx }));
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.docx.mockReset().mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(Header, {
    user: { uid: "test", displayName: "Test" } as User,
    onAddBox: vi.fn(), onShare: vi.fn(), onNewBoard: vi.fn(), onLoadBoard: vi.fn(), onDeleteBoard: vi.fn(), onClearBoard: vi.fn(), onLogout: vi.fn(),
    isAdmin: false, isFacilitator: false, adminView: false, facilitatorView: false, onToggleAdminView: vi.fn(), onToggleFacilitatorView: vi.fn(),
  })));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(label));
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
it("offers only the Word report download", async () => {
  await click("Boards (");
  expect(container.textContent).not.toContain("Export report as PDF");
  await click("Export report as Word (.docx)");
  expect(mocks.docx).toHaveBeenCalledOnce();
  expect(mocks.docx.mock.calls[0][0].boardTitle).toBe("Portal");
});
it("shows a download failure and allows a retry", async () => {
  mocks.docx.mockRejectedValueOnce(new Error("Download failed"));
  await click("Boards (");
  await click("Export report as Word (.docx)");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("could not be exported");
  await click("Export report as Word (.docx)");
  expect(mocks.docx).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
