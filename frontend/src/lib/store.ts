import { create } from "zustand";

type AppState = {
  selectedScenarioId: number | null;
  lastRunId: number | null;
  setSelectedScenarioId: (id: number | null) => void;
  setLastRunId: (id: number | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedScenarioId: null,
  lastRunId: null,
  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),
  setLastRunId: (id) => set({ lastRunId: id })
}));

