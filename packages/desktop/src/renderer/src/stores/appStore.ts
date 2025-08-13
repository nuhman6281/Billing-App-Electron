import { create } from "zustand";

interface AppInfo {
  name: string;
  version: string;
}

interface AppState {
  appInfo: AppInfo | null;
  menuAction: string | null;
  setAppInfo: (info: AppInfo) => void;
  setMenuAction: (action: string) => void;
  clearMenuAction: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  appInfo: null,
  menuAction: null,
  setAppInfo: (info) => set({ appInfo: info }),
  setMenuAction: (action) => set({ menuAction: action }),
  clearMenuAction: () => set({ menuAction: null }),
}));
