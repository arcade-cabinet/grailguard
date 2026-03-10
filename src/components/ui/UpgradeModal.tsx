import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { BUILDING_COST, type BuildingType } from '../../engine/constants';
import { useGameStore } from '../../store/useGameStore';

interface UpgradeModalProps {
  buildingId: string | null;
  onClose: () => void;
}

export function UpgradeModal({ buildingId, onClose }: UpgradeModalProps) {
  const store = useGameStore();
  const building = buildingId ? store.buildings[buildingId] : null;

  if (!building) return null;

  const type = building.type;
  const baseCost = BUILDING_COST[type];
  const upgradeCost = Math.floor(baseCost * 1.5 ** building.levelStats);

  const handleUpgrade = () => {
    if (store.upgradeBuilding(building.id, upgradeCost)) {
      onClose();
    }
  };

  const handleSell = () => {
    store.addGold(Math.floor(baseCost * 0.5));
    store.removeBuilding(building.id);
    onClose();
  };

  return (
    <Modal visible={!!buildingId} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-[#eaddcf] border-2 border-[#5c4033] rounded-lg p-6 w-72">
          <Text className="text-[#3e2723] text-xl font-bold text-center mb-2">
            {type.toUpperCase()} (Level {building.levelStats})
          </Text>
          <Text className="text-[#5c4033] text-sm text-center mb-4">Gold: {store.gold}</Text>

          <View className="bg-[#d4c5b0] border border-[#5c4033] rounded p-3 mb-3">
            <Text className="text-[#3e2723] font-bold text-center mb-2">Upgrade Stats (+20%)</Text>
            <TouchableOpacity
              onPress={handleUpgrade}
              disabled={store.gold < upgradeCost}
              className={`rounded py-2 px-4 items-center ${
                store.gold >= upgradeCost ? 'bg-[#228822]' : 'bg-gray-400'
              }`}
            >
              <Text className="text-white font-bold">Upgrade ({upgradeCost}g)</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-[#d4c5b0] border border-[#5c4033] rounded p-3 mb-3">
            <TouchableOpacity
              onPress={handleSell}
              className="rounded py-2 px-4 items-center bg-[#882222]"
            >
              <Text className="text-white font-bold">Sell (+{Math.floor(baseCost * 0.5)}g)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="bg-[#3e2723] rounded py-2 items-center mt-2"
          >
            <Text className="text-[#eaddcf] font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
