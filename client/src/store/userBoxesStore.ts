import { create } from "zustand";
import {
  deleteUserBox,
  listUserBoxes,
  saveUserBox,
} from "../lib/firestore.js";
import {
  normalizeCustomBoxDraft,
  sortCustomBoxDefs,
  type CustomBoxDef,
  type CustomBoxDraft,
} from "../lib/customBoxes.js";
import { useAuthStore } from "./authStore.js";

/**
 * The signed-in user's custom box definitions (reusable AI box templates
 * saved in their profile at users/{uid}/boxes). Loaded on login; creating a
 * box in the palette adds an INSTANCE to the board whose prompt/systemPrompt
 * are copied from the definition — deleting a definition never affects
 * boxes already on boards.
 */
interface UserBoxesState {
  defs: CustomBoxDef[];
  loading: boolean;
  load: () => Promise<void>;
  create: (draft: CustomBoxDraft) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
}

export const useUserBoxesStore = create<UserBoxesState>((set, get) => ({
  defs: [],
  loading: false,

  load: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ defs: [] });
      return;
    }
    set({ loading: true });
    try {
      const defs = await listUserBoxes(user.uid);
      set({ defs: sortCustomBoxDefs(defs) });
    } catch (err) {
      console.warn("[customBoxes] Could not load saved boxes:", err);
      set({ defs: [] });
    } finally {
      set({ loading: false });
    }
  },

  create: async (draft) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;
    const now = Date.now();
    const def = normalizeCustomBoxDraft(draft);
    const id = await saveUserBox(user.uid, {
      ...def,
      createdAt: now,
      updatedAt: now,
    });
    const created: CustomBoxDef = { id, ...def, createdAt: now, updatedAt: now };
    set({ defs: sortCustomBoxDefs([...get().defs, created]) });
    return id;
  },

  remove: async (id) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ defs: get().defs.filter((d) => d.id !== id) });
    try {
      await deleteUserBox(user.uid, id);
    } catch (err) {
      console.warn("[customBoxes] Could not delete saved box:", err);
      get().load(); // resync on failure
    }
  },
}));