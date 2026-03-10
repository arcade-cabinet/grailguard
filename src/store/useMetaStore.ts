import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import gameConfig from '../data/gameConfig.json';
import type { BuildingType } from '../engine/constants';

export interface MetaState {
  coins: number;
  unlocks: Record<BuildingType, boolean>;
  awardCoins: (amount: number) => void;
  unlockBuilding: (type: BuildingType, cost: number) => boolean;
  resetMeta: () => void;
}

const defaultUnlocks: Record<BuildingType, boolean> = {
  wall: gameConfig.market.initialUnlocks.includes('wall'),
  hut: gameConfig.market.initialUnlocks.includes('hut'),
  range: gameConfig.market.initialUnlocks.includes('range'),
  temple: gameConfig.market.initialUnlocks.includes('temple'),
  keep: gameConfig.market.initialUnlocks.includes('keep'),
  turret: gameConfig.market.initialUnlocks.includes('turret'),
  ballista: gameConfig.market.initialUnlocks.includes('ballista'),
  cannon: gameConfig.market.initialUnlocks.includes('cannon'),
  catapult: gameConfig.market.initialUnlocks.includes('catapult'),
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
