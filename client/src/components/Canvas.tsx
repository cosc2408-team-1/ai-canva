import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useViewport,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useBoardStore } from "../store/boardStore.js";
import { AREA_COLORS, BOX_TYPES, isSecurityArtifactBoxType, type BoxType } from "../types.js";
import { isValidAreaSize, normalizeRect } from "../lib/areas.js";
import { buildSecurityTraceGraph, traceBoxIds, traceEntity } from "../lib/securityTraceability.js";
import { deriveTraceEdgePresentation, deriveTraceNodePresentation } from "../lib/securityTraceabilityPresentation.js";
import { deriveMicrosoftSecurityLens } from "../lib/microsoftSecurityLens.js";
import {
  buildSecurityDemoTraceGraph,
  findDemoArtifactBox,
  findBestTraceEntity,
  findSecurityWorkflow,
  isSecurityDemoOwnedSelection,
  resolveSecurityDemoFocus,
  resolveSecurityDemoSelection,
  securityWorkflowStageIds,
  type SecurityDemoSelectionOwner,
} from "../lib/securityDemo.js";
import { useBoardTraceSelection, useSecurityTraceStore } from "../store/securityTraceStore.js";
import { useSecurityDemoStore } from "../store/securityDemoStore.js";
import { Button } from "./ui/Button.js";
import BoxNode from "./BoxNode.js";
import AreaNode from "./AreaNode.js";
import Cursors from "./Cursors.js";
import { SecurityTraceContext } from "./SecurityTraceContext.js";
import SecurityTraceabilityInspector from "./SecurityTraceabilityInspector.js";
import { SecurityDemoAction, SecurityDemoCoachmark } from "./SecurityGuidedDemo.js";

const BOX_NODE_TYPES = Object.fromEntries(
  (Object.keys(BOX_TYPES) as BoxType[]).map((type) => [type, BoxNode]),
) as Record<BoxType, typeof BoxNode>;

export const NODE_TYPES = { ...BOX_NODE_TYPES, area: AreaNode };

export const UNKNOWN_MINIMAP_NODE_COLOR = "#94a3b8";

function isBoxType(type: string | undefined): type is BoxType {
  return !!type && Object.prototype.hasOwnProperty.call(BOX_TYPES, type);
}

export function resolveMiniMapNodeColor(node: Pick<Node, "type" | "data">): string {
  if (node.type === "area") {
    return ((node.data as Record<string, unknown>)?.border as string) || "#cbd5e1";
  }
  if (node.type === "custom") {
    return ((node.data as Record<string, unknown>)?.customColor as string) || BOX_TYPES.custom.color;
  }
  return isBoxType(node.type) ? BOX_TYPES[node.type].color : UNKNOWN_MINIMAP_NODE_COLOR;
}

export default function Canvas() {
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const boxData = useBoardStore((s) => s.boxData);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);
  const onNodesChange = useBoardStore((s) => s.onNodesChange);
  const onEdgesChange = useBoardStore((s) => s.onEdgesChange);
  const onConnect = useBoardStore((s) => s.onConnect);
  const updateCursorPosition = useBoardStore((s) => s.updateCursorPosition);
  const cleanupPresence = useBoardStore((s) => s.cleanupPresence);
  const selectedTraceEntityId = useBoardTraceSelection(currentBoardId);
  const selectTraceEntity = useSecurityTraceStore((s) => s.selectEntity);
  const clearTraceSelection = useSecurityTraceStore((s) => s.clearSelection);
  const demoActive = useSecurityDemoStore((s) => s.active);
  const demoStep = useSecurityDemoStore((s) => s.step);
  const demoBoardId = useSecurityDemoStore((s) => s.boardId);
  const finishDemo = useSecurityDemoStore((s) => s.finish);
  const demoSelectionRef = useRef<SecurityDemoSelectionOwner | null>(null);
  const [demoSelectionOwner, setDemoSelectionOwnerState] = useState<SecurityDemoSelectionOwner | null>(null);
  const orchestratedStepRef = useRef<string | null>(null);
  const [inspectorView, setInspectorView] = useState<"traceability" | "microsoft-security-lens">("traceability");

  const traceSources = useMemo(() => nodes.flatMap((node) => {
    const candidateType = node.type || node.data?.boxType;
    if (typeof candidateType !== "string" || !isSecurityArtifactBoxType(candidateType)) return [];
    const output = boxData[node.id]?.output;
    return output ? [{ boxId: node.id, boxType: candidateType, output }] : [];
  }), [nodes, boxData]);
  const traceGraph = useMemo(() => buildSecurityTraceGraph(traceSources), [traceSources]);
  const securityWorkflow = useMemo(() => findSecurityWorkflow(nodes, edges), [nodes, edges]);
  const demoTraceGraph = useMemo(
    () => securityWorkflow ? buildSecurityDemoTraceGraph(securityWorkflow, boxData) : { entities: [], relations: [] },
    [securityWorkflow, boxData],
  );
  const demoArtifactBox = useMemo(
    () => securityWorkflow ? findDemoArtifactBox(securityWorkflow, boxData) : null,
    [securityWorkflow, boxData],
  );
  const artifactOutputCount = useMemo(() => securityWorkflow && demoArtifactBox
    ? securityWorkflowStageIds(securityWorkflow).slice(1).filter((id) => Boolean(boxData[id]?.output?.trim())).length
    : 0, [securityWorkflow, demoArtifactBox, boxData]);
  const hasTraceTarget = useMemo(() => Boolean(findBestTraceEntity(demoTraceGraph)), [demoTraceGraph]);
  const traceableEntityIds = useMemo(() => new Set(traceGraph.entities.map(({ id }) => id)), [traceGraph]);
  const demoTraceableEntityIds = useMemo(
    () => new Set(demoTraceGraph.entities.map(({ id }) => id)),
    [demoTraceGraph],
  );
  const setDemoSelectionOwner = useCallback((owner: SecurityDemoSelectionOwner | null) => {
    demoSelectionRef.current = owner;
    setDemoSelectionOwnerState(owner);
  }, []);
  const selectTraceableEntity = useCallback((id: string) => {
    if (!traceableEntityIds.has(id)) return;
    const selection = useSecurityTraceStore.getState();
    const transition = resolveSecurityDemoSelection(
      "manual",
      id,
      currentBoardId,
      selection.selectedEntityId,
      selection.selectedBoardId,
      demoSelectionRef.current,
    );
    setDemoSelectionOwner(transition.owner);
    if (transition.shouldSelect) selectTraceEntity(id, currentBoardId);
  }, [selectTraceEntity, setDemoSelectionOwner, traceableEntityIds, currentBoardId]);
  const traceContext = useMemo(() => ({
    traceableEntityIds,
    selectEntity: selectTraceableEntity,
  }), [traceableEntityIds, selectTraceableEntity]);
  const demoOwnsSelection = isSecurityDemoOwnedSelection(
    demoSelectionOwner,
    selectedTraceEntityId,
    currentBoardId,
  );
  const activeTraceGraph = demoOwnsSelection ? demoTraceGraph : traceGraph;
  const selectedTraceEntity = selectedTraceEntityId ? traceEntity(activeTraceGraph, selectedTraceEntityId) : undefined;
  const hasLensMatch = useMemo(() => selectedTraceEntity
    ? deriveMicrosoftSecurityLens(activeTraceGraph, selectedTraceEntity.id).matches.length > 0
    : false, [activeTraceGraph, selectedTraceEntity]);

  const clearDemoOwnedSelection = useCallback(() => {
    const owner = demoSelectionRef.current;
    const selection = useSecurityTraceStore.getState();
    if (isSecurityDemoOwnedSelection(owner, selection.selectedEntityId, selection.selectedBoardId)) {
      clearTraceSelection();
    }
    setDemoSelectionOwner(null);
  }, [clearTraceSelection, setDemoSelectionOwner]);

  const finishGuidedDemo = useCallback(() => {
    clearDemoOwnedSelection();
    orchestratedStepRef.current = null;
    setInspectorView("traceability");
    finishDemo();
  }, [clearDemoOwnedSelection, finishDemo]);

  useEffect(() => () => {
    const owner = demoSelectionRef.current;
    const selection = useSecurityTraceStore.getState();
    if (isSecurityDemoOwnedSelection(owner, selection.selectedEntityId, selection.selectedBoardId)) {
      clearTraceSelection();
    }
    demoSelectionRef.current = null;
    finishDemo();
  }, [clearTraceSelection, finishDemo]);

  const selectDemoEntity = useCallback((id: string) => {
    if (!demoTraceableEntityIds.has(id)) return;
    const selection = useSecurityTraceStore.getState();
    const transition = resolveSecurityDemoSelection(
      "demo",
      id,
      currentBoardId,
      selection.selectedEntityId,
      selection.selectedBoardId,
      demoSelectionRef.current,
    );
    setDemoSelectionOwner(transition.owner);
    if (transition.shouldSelect) selectTraceEntity(id, currentBoardId);
  }, [currentBoardId, demoTraceableEntityIds, selectTraceEntity, setDemoSelectionOwner]);

  useEffect(() => {
    if (!demoActive) {
      orchestratedStepRef.current = null;
      return;
    }
    if (demoBoardId !== currentBoardId || !securityWorkflow) {
      finishGuidedDemo();
      return;
    }

    const stepKey = `${currentBoardId ?? "local"}:${demoStep}`;
    if (orchestratedStepRef.current === stepKey) return;
    orchestratedStepRef.current = stepKey;

    const focus = resolveSecurityDemoFocus(demoStep, demoTraceGraph, selectedTraceEntityId);
    setInspectorView(focus.view);
    if (!focus.entityId) {
      clearDemoOwnedSelection();
    } else {
      selectDemoEntity(focus.entityId);
    }
  }, [
    demoActive,
    demoBoardId,
    demoStep,
    currentBoardId,
    securityWorkflow,
    demoTraceGraph,
    selectedTraceEntityId,
    selectDemoEntity,
    clearDemoOwnedSelection,
    finishGuidedDemo,
  ]);

  const closeInspector = useCallback(() => {
    setDemoSelectionOwner(null);
    setInspectorView("traceability");
    clearTraceSelection();
  }, [clearTraceSelection, setDemoSelectionOwner]);

  useEffect(() => {
    if (selectedTraceEntityId && !selectedTraceEntity) clearTraceSelection();
  }, [selectedTraceEntityId, selectedTraceEntity, clearTraceSelection]);

  const tracedBoxIds = useMemo(
    () => new Set(selectedTraceEntityId && selectedTraceEntity ? traceBoxIds(activeTraceGraph, selectedTraceEntityId) : []),
    [selectedTraceEntityId, selectedTraceEntity, activeTraceGraph],
  );
  const selectedEntityBoxIds = useMemo(
    () => new Set(selectedTraceEntity?.occurrences.map(({ boxId }) => boxId) || []),
    [selectedTraceEntity],
  );
  const displayNodes = useMemo(
    () => selectedTraceEntity ? deriveTraceNodePresentation(nodes, tracedBoxIds, selectedEntityBoxIds) : nodes,
    [nodes, selectedTraceEntity, tracedBoxIds, selectedEntityBoxIds],
  );
  const displayEdges = useMemo(
    () => selectedTraceEntity && selectedTraceEntityId
      ? deriveTraceEdgePresentation(edges, activeTraceGraph, selectedTraceEntityId) : edges,
    [edges, selectedTraceEntity, selectedTraceEntityId, activeTraceGraph],
  );

  const { screenToFlowPosition } = useReactFlow();

  // Track mouse movement and update presence
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (pos) {
        updateCursorPosition(pos.x, pos.y);
      }
    },
    [screenToFlowPosition, updateCursorPosition]
  );

  // Touch mirror of the presence cursor — iPads never fire mousemove, so
  // collaborators would otherwise not see where the tablet user is pointing.
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const pos = screenToFlowPosition({ x: t.clientX, y: t.clientY });
      if (pos) {
        updateCursorPosition(pos.x, pos.y);
      }
    },
    [screenToFlowPosition, updateCursorPosition]
  );

  // Cleanup presence on unmount
  useEffect(() => {
    return () => cleanupPresence();
  }, [cleanupPresence]);

  // === Chatbot auto-placement ===
  // Chatbots added from the palette carry data.autoPlace; on the effect tick
  // (and after every store update — it early-returns when none are pending)
  // each one is placed at the BOTTOM-CENTER of the current viewport, offset
  // horizontally so multiple companions don't stack.
  const placeChatbot = useBoardStore((s) => s.placeChatbot);
  useEffect(() => {
    const place = () => {
      const st = useBoardStore.getState();
      const pending = st.nodes.filter(
        (n) => n.type === "chatbot" && (n.data as Record<string, unknown> | undefined)?.autoPlace
      );
      if (pending.length === 0) return;
      const el = document.querySelector(".react-flow");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const alreadyHere = st.nodes.filter((n) => n.type === "chatbot").length - pending.length;
      pending.forEach((b, i) => {
        const pos = screenToFlowPosition({
          x: rect.left + rect.width / 2 + (alreadyHere + i) * 150,
          y: rect.top + rect.height - 130,
        });
        if (pos) placeChatbot(b.id, pos);
      });
    };
    place();
    return useBoardStore.subscribe(place);
  }, [placeChatbot, screenToFlowPosition]);

  // === Area drawing tool ===
  const addArea = useBoardStore((s) => s.addArea);
  const [areaTool, setAreaTool] = useState(false);
  const [areaColorIdx, setAreaColorIdx] = useState(0);
  const [draft, setDraft] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Begin a draft on pane mousedown while the tool is active; track the drag
  // with window listeners so the rectangle keeps following the cursor even
  // outside the pane.
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!areaTool) return;
      // Only start on empty canvas — not on an existing node/area.
      const target = e.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setDraft({ start: p, current: p });
      e.preventDefault();
    },
    [areaTool, screenToFlowPosition]
  );

  useEffect(() => {
    if (!draft) return;
    const track = (clientX: number, clientY: number) => {
      const d = draftRef.current;
      if (!d) return;
      setDraft({ ...d, current: screenToFlowPosition({ x: clientX, y: clientY }) });
    };
    const onMove = (e: MouseEvent) => track(e.clientX, e.clientY);
    const commit = () => {
      const d = draftRef.current;
      setDraft(null);
      if (!d) return;
      const rect = normalizeRect(d.start, d.current);
      if (isValidAreaSize(rect)) {
        const c = AREA_COLORS[areaColorIdx] || AREA_COLORS[0];
        addArea(rect, c.fill, c.border);
      }
    };
    const onTouchMove = (e: Event) => {
      const te = e as TouchEvent;
      if (te.touches.length !== 1) return;
      te.preventDefault();
      track(te.touches[0].clientX, te.touches[0].clientY);
    };
    const onTouchCancel = () => setDraft(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", commit);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", commit);
    window.addEventListener("touchcancel", onTouchCancel);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", commit);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", commit);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [draft !== null, areaColorIdx, addArea, screenToFlowPosition]);

  // Touch mirror of onCanvasMouseDown — iPads never fire the synthesized
  // mousedown on the pane (React Flow's touch handlers suppress it), so the
  // Area tool needs its own touchstart listener while it is active.
  useEffect(() => {
    if (!areaTool) return;
    const pane = document.querySelector<HTMLElement>(".react-flow__pane");
    if (!pane) return;
    const onTouchStart = (e: Event) => {
      const te = e as TouchEvent;
      if (te.touches.length !== 1) return;
      const target = te.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      const t = te.touches[0];
      const p = screenToFlowPosition({ x: t.clientX, y: t.clientY });
      setDraft({ start: p, current: p });
      te.preventDefault();
    };
    pane.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => pane.removeEventListener("touchstart", onTouchStart);
  }, [areaTool, screenToFlowPosition]);

  // Escape cancels an in-progress draft and deactivates the tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDraft(null);
      setAreaTool(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const draftRect = draft ? normalizeRect(draft.start, draft.current) : null;

  return (
    <SecurityTraceContext.Provider value={traceContext}>
      <div className="flex h-full min-h-0 w-full flex-col">
        <SecurityDemoCoachmark
          active={demoActive}
          step={demoStep}
          artifactOutputCount={artifactOutputCount}
          hasTraceTarget={hasTraceTarget}
          hasLensMatch={hasLensMatch}
          inspectorOpen={Boolean(selectedTraceEntity)}
          onFinish={finishGuidedDemo}
        />
        <div className="relative min-h-0 flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onMouseMove={onMouseMove}
            onMouseDown={onCanvasMouseDown}
            onTouchMove={onTouchMove}
            // Double-tap / double-click zoom is surprising on touch — the pinch
            // gesture already covers zooming.
            zoomOnDoubleClick={false}
            // While the area tool is active, dragging draws a rectangle instead of
            // panning the canvas or moving nodes.
            panOnDrag={!areaTool}
            nodesDraggable={!areaTool}
            className={`absolute inset-0 ${areaTool ? "area-tool-active" : ""}`}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#cbd5e1", strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
            // Treat every node as a "no wheel" zone: when the cursor is over a box,
            // trackpad scroll / pinch must not zoom the canvas (it would fight the
            // box's own scrolling). Zooming still works over empty canvas space.
            noWheelClassName="react-flow__node"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
            <Controls />
            <Cursors />
            {selectedTraceEntity && selectedTraceEntityId && (
              <SecurityTraceabilityInspector
                graph={activeTraceGraph}
                selectedEntityId={selectedTraceEntityId}
                onSelectEntity={selectTraceableEntity}
                onClose={closeInspector}
                view={inspectorView}
                onViewChange={setInspectorView}
              />
            )}
            <Panel position="top-left" className="m-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <SecurityDemoAction available={Boolean(securityWorkflow)} boardId={currentBoardId} />
                <Button
                  size="xs"
                  variant={areaTool ? "primary" : "secondary"}
                  onClick={() => { setAreaTool((t) => !t); setDraft(null); }}
                  title="Draw a rectangular area under the boxes"
                  className="shadow-md"
                >
                  ▭ {areaTool ? "Drawing areas — Esc to stop" : "Area"}
                </Button>
              </div>
              {areaTool && (
                <div className="flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur px-2 py-1.5 shadow-md border border-slate-200">
                  {AREA_COLORS.map((c, i) => (
                    <button
                      key={c.fill}
                      onClick={() => setAreaColorIdx(i)}
                      title={`Draw color — ${c.name}`}
                      className={
                        "w-5 h-5 rounded-md border transition hover:scale-110 " +
                        (i === areaColorIdx ? "border-slate-600 scale-110" : "border-slate-300")
                      }
                      style={{ backgroundColor: c.fill, borderColor: i === areaColorIdx ? c.border : undefined }}
                    />
                  ))}
                </div>
              )}
            </Panel>
            {/* Draft rectangle preview (viewport-transformed like Cursors) */}
            {draftRect && <AreaDraft rect={draftRect} />}
            <MiniMap pannable zoomable nodeColor={resolveMiniMapNodeColor} />
          </ReactFlow>
        </div>
      </div>
    </SecurityTraceContext.Provider>
  );
}

/** In-progress area rectangle, transformed with the viewport like Cursors. */
function AreaDraft({ rect }: { rect: { x: number; y: number; width: number; height: number } }) {
  const viewport = useViewport();
  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "0 0",
      }}
    >
      <div
        className="absolute rounded-xl"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          backgroundColor: "rgba(6, 182, 212, 0.06)",
          border: "1.5px dashed #06b6d4",
        }}
      />
    </div>
  );
}
