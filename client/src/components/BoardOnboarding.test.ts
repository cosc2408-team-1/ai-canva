import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { User } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import BoardEmptyState from "./BoardEmptyState.js";
import Header from "./Header.js";
import NewBoardModal, { boardNameAfterTemplateChange } from "./NewBoardModal.js";
import Sidebar from "./Sidebar.js";

const action = vi.fn();
const emptyStateProps = {
  sidebarOpen: true,
  onCreateSecurityAssessment: action,
  onBrowseTemplates: action,
  onBuildManually: action,
};
const sidebarProps = {
  open: true,
  onToggle: action,
  onCreateSecurityAssessment: action,
  onBrowseTemplates: action,
  onBuildManually: action,
  onBackToGetStarted: action,
};

describe("board-first onboarding", () => {
  it("shows the featured workflow only when the empty state is visible", () => {
    expect(renderToStaticMarkup(createElement(BoardEmptyState, {
      ...emptyStateProps,
      visible: false,
    }))).toBe("");

    const html = renderToStaticMarkup(createElement(BoardEmptyState, {
      ...emptyStateProps,
      visible: true,
    }));
    expect(html).toContain("Start a workflow");
    expect(html).toContain("Create Security Assessment");
    expect(html).toContain("Browse templates");
    expect(html).toContain("Build manually");
    for (const stage of ["Discover", "Specify", "Assess", "Advise"]) {
      expect(html).toContain(stage);
    }
  });

  it("shows Get Started only for empty boards in onboarding mode", () => {
    const onboarding = renderToStaticMarkup(createElement(Sidebar, {
      ...sidebarProps,
      isEmpty: true,
      emptyBoardMode: "onboarding",
    }));
    expect(onboarding).toContain("Get Started");
    expect(onboarding).toContain("Create Security Assessment");
    expect(onboarding).not.toContain("Workers");
    expect(onboarding).not.toContain("Filter which boxes appear");

    const manual = renderToStaticMarkup(createElement(Sidebar, {
      ...sidebarProps,
      isEmpty: true,
      emptyBoardMode: "manual",
    }));
    expect(manual).toContain("Add Box");
    expect(manual).toContain("Back to Get Started");
    expect(manual).toContain("Workers");

    const populated = renderToStaticMarkup(createElement(Sidebar, {
      ...sidebarProps,
      isEmpty: false,
      emptyBoardMode: "onboarding",
    }));
    expect(populated).toContain("Add Box");
    expect(populated).toContain("Workers");
    expect(populated).not.toContain("Back to Get Started");
  });

  it("opens the modal with the requested template selected", () => {
    const renderModal = (initialTemplateId: "blank" | "security-assessment") =>
      renderToStaticMarkup(createElement(NewBoardModal, {
        open: true,
        initialTemplateId,
        onClose: action,
        onCreate: action,
      }));
    const selectedValue = (html: string) => {
      const radio = (html.match(/<input[^>]*name="board-template"[^>]*>/g) || [])
        .find((input) => input.includes('checked=""'));
      return radio?.match(/value="([^"]+)"/)?.[1];
    };

    expect(selectedValue(renderModal("security-assessment"))).toBe("security-assessment");
    expect(selectedValue(renderModal("blank"))).toBe("blank");
    expect(renderModal("security-assessment")).toContain("Create Security Assessment");
    expect(renderModal("blank")).toContain("Create Blank Board");
    expect(renderModal("security-assessment")).toContain('value="Security Assessment"');
    expect(renderModal("blank")).toContain('value="Untitled Board"');
  });

  it("updates untouched default names while preserving a user-entered name", () => {
    expect(boardNameAfterTemplateChange("Security Assessment", false, "blank")).toBe("Untitled Board");
    expect(boardNameAfterTemplateChange("Untitled Board", false, "security-assessment")).toBe("Security Assessment");
    expect(boardNameAfterTemplateChange("My Demo Security Review", true, "blank")).toBe("My Demo Security Review");
    expect(boardNameAfterTemplateChange("My Demo Security Review", true, "security-assessment")).toBe("My Demo Security Review");
  });

  it("exposes New Board before Add Box and Boards in the top bar", () => {
    const html = renderToStaticMarkup(createElement(Header, {
      user: { uid: "test-user", displayName: "Tester", email: "test@example.invalid" } as User,
      onAddBox: action,
      onShare: action,
      onNewBoard: action,
      onLoadBoard: action,
      onDeleteBoard: action,
      onClearBoard: action,
      onLogout: action,
      isAdmin: false,
      isFacilitator: false,
      adminView: false,
      facilitatorView: false,
      onToggleAdminView: action,
      onToggleFacilitatorView: action,
    }));
    expect(html.indexOf("+ New Board")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("+ Add Box")).toBeGreaterThan(html.indexOf("+ New Board"));
    expect(html.indexOf("Boards (")).toBeGreaterThan(html.indexOf("+ Add Box"));
  });
});
