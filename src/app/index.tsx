import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMetaStore } from '../store/useMetaStore';
import { MarketModal } from '../components/ui/MarketModal';

export default function MainMenuScreen() {
  const router = useRouter();
  const coins = useMetaStore((s) => s.coins);
  const [marketOpen, setMarketOpen] = useState(false);

  return (
    <View className="flex-1 bg-[#2b1d14] justify-center items-center">
      {/* Title */}
      <View className="mb-12 items-center">
        <Text className="text-[#ffd700] text-5xl font-bold tracking-widest">
          ⚔ GRAILGUARD ⚔
        </Text>
        <Text className="text-[#eaddcf] text-sm mt-2 tracking-widest">
          DEFEND THE SACRED GRAIL
        </Text>
      </View>

      {/* Coins */}
      <View className="bg-[#3e2723] border border-[#5c4033] rounded-lg px-6 py-2 mb-8">
        <Text className="text-[#ffd700] text-lg font-bold">⚜ {coins} Coins</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        onPress={() => router.push('/game')}
        className="bg-[#5c4033] border-2 border-[#8b6555] rounded-lg px-12 py-4 mb-4 w-64 items-center"
      >
        <Text className="text-[#eaddcf] text-xl font-bold">⚔ Embark</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMarketOpen(true)}
        className="bg-[#3e2723] border border-[#5c4033] rounded-lg px-12 py-3 w-64 items-center"
      >
        <Text className="text-[#eaddcf] text-lg">🏪 Market</Text>
      </TouchableOpacity>

      <MarketModal visible={marketOpen} onClose={() => setMarketOpen(false)} />
    </View>
  );
}
