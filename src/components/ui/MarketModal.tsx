import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useMetaStore } from '../../store/useMetaStore';

interface MarketItem {
  type: 'range' | 'temple' | 'keep';
  label: string;
  cost: number;
  description: string;
}

const MARKET_ITEMS: MarketItem[] = [
  {
    type: 'range',
    label: 'Archery Range',
    cost: 50,
    description: 'Unlocks the Archery Range building. Trains Archers.',
  },
  {
    type: 'temple',
    label: 'Cleric Temple',
    cost: 150,
    description: 'Unlocks the Cleric Temple. Trains healing Clerics.',
  },
  {
    type: 'keep',
    label: 'Knight Keep',
    cost: 300,
    description: 'Unlocks the Knight Keep. Trains powerful Knights.',
  },
];

interface MarketModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Render a market modal that displays available building unlocks and lets the player purchase them.
 *
 * @param visible - Whether the modal is shown
 * @param onClose - Callback invoked when the modal should be closed
 * @returns A React element that displays the market UI with item cards, purchase buttons, current coins, and a close action
 */
export function MarketModal({ visible, onClose }: MarketModalProps) {
  const { coins, unlocks, unlockBuilding } = useMetaStore();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-[#eaddcf] border-2 border-[#5c4033] rounded-lg p-6 w-80">
          <Text className="text-[#3e2723] text-xl font-bold text-center mb-2">⚜ Market ⚜</Text>
          <Text className="text-[#5c4033] text-sm text-center mb-4">Coins: {coins}</Text>

          {MARKET_ITEMS.map((item) => {
            const owned = unlocks[item.type];
            return (
              <View
                key={item.type}
                className="bg-[#d4c5b0] border border-[#5c4033] rounded p-3 mb-3"
              >
                <Text className="text-[#3e2723] font-bold">{item.label}</Text>
                <Text className="text-[#5c4033] text-xs mb-2">{item.description}</Text>
                {owned ? (
                  <Text className="text-green-700 font-bold text-center">✓ Unlocked</Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => unlockBuilding(item.type, item.cost)}
                    disabled={coins < item.cost}
                    className={`rounded py-1 px-4 items-center ${
                      coins >= item.cost ? 'bg-[#5c4033]' : 'bg-gray-400'
                    }`}
                  >
                    <Text className="text-[#eaddcf] font-bold">{item.cost} Coins</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

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
