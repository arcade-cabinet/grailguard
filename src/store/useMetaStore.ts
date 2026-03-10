import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BuildingType } from '../engine/constants';

export interface MetaState {
  coins: number;
  unlocks: Record<BuildingType, boolean>;
  awardCoins: (amount: number) => void;
  unlockBuilding: (type: BuildingType, cost: number) => boolean;
  resetMeta: () => void;
}

const defaultUnlocks: Record<BuildingType, boolean> = {
  wall: true,
  hut: true,
  range: false,
  temple: false,
  keep: false,
};

export const useMetaStore = create<MetaState>()(
  persist(
    (set, get) => ({
      coins: 0,
      unlocks: { ...defaultUnlocks },

      awardCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

      unlockBuilding: (type, cost) => {
        const { coins, unlocks } = get();
        if (unlocks[type]) return true;
        if (coins < cost) return false;
        set((s) => ({
          coins: s.coins - cost,
          unlocks: { ...s.unlocks, [type]: true },
        }));
        return true;
      },

      resetMeta: () => set({ coins: 0, unlocks: { ...defaultUnlocks } }),
    }),
    {
      name: 'grailguard-meta',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
