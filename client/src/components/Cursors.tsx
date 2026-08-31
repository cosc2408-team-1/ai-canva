import { useViewport } from "@xyflow/react";
import { useBoardStore } from "../store/boardStore.js";
import { useAuthStore } from "../store/authStore.js";

/**
 * Renders live cursor overlays for other active users on the board.
 * Must be rendered inside <ReactFlow> to access the viewport context.
 */
export default function Cursors() {
  const viewport = useViewport();
  const activeUsers = useBoardStore((s) => s.activeUsers);
  const currentUser = useAuthStore((s) => s.user);

  // Filter out self, and users who are online (presence heartbeat) but have
  // never moved their cursor — without this they'd render a cursor at (0, 0).
  const otherUsers = activeUsers.filter(
    (u) => u.userId !== currentUser?.uid && u.hasCursor !== false
  );

  if (otherUsers.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "0 0",
      }}
    >
      {otherUsers.map((user) => {
        const left = user.cursorX;
        const top = user.cursorY;
        return (
          <div
            key={user.userId}
            className="absolute"
            style={{
              left,
              top,
              transition: "left 0.15s ease-out, top 0.15s ease-out",
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}
            >
              <path
                d="M5.5 3.5L18 10L11.5 11.5L10 18L5.5 3.5Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {/* Name label */}
            <div
              className="absolute top-5 left-4 px-2 py-0.5 rounded-full text-white text-xs font-medium whitespace-nowrap shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </div>
          </div>
        );
      })}
    </div>
  );
}
