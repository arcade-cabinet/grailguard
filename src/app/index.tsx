import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMetaStore } from '../store/useMetaStore';
import { MarketModal } from '../components/ui/MarketModal';

export default function MainMenuScreen() {
  const router       = useRouter();
  const coins        = useMetaStore((s) => s.coins);
  const [marketOpen, setMarketOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a0e08', justifyContent: 'center', alignItems: 'center' }}>
      {/* Decorative top rule */}
      <View style={{ width: 260, height: 2, backgroundColor: '#5c4033', marginBottom: 28 }} />

      {/* Title */}
      <Text style={{ color: '#ffd700', fontSize: 46, fontWeight: 'bold', letterSpacing: 6, marginBottom: 4 }}>
        ⚔ GRAILGUARD ⚔
      </Text>
      <Text style={{ color: '#b09070', fontSize: 12, letterSpacing: 4, marginBottom: 32 }}>
        DEFEND THE SACRED GRAIL
      </Text>

      {/* Coin display */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#2b1d14', borderWidth: 1, borderColor: '#5c4033',
        borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8, marginBottom: 36,
      }}>
        <Text style={{ color: '#ffd700', fontSize: 22, marginRight: 6 }}>⚜</Text>
        <Text style={{ color: '#ffd700', fontSize: 18, fontWeight: 'bold' }}>{coins}</Text>
        <Text style={{ color: '#b09070', fontSize: 12, marginLeft: 6 }}>coins</Text>
      </View>

      {/* Play button */}
      <TouchableOpacity
        onPress={() => router.push('/game')}
        activeOpacity={0.75}
        style={{
          backgroundColor: '#5c4033',
          borderWidth: 2, borderColor: '#8b6555',
          borderRadius: 12, paddingHorizontal: 48, paddingVertical: 16,
          marginBottom: 14, width: 260, alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Text style={{ color: '#ffd700', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 }}>⚔  EMBARK</Text>
      </TouchableOpacity>

      {/* Market button */}
      <TouchableOpacity
        onPress={() => setMarketOpen(true)}
        activeOpacity={0.8}
        style={{
          backgroundColor: '#2b1d14',
          borderWidth: 1, borderColor: '#5c4033',
          borderRadius: 12, paddingHorizontal: 48, paddingVertical: 12,
          width: 260, alignItems: 'center',
        }}
      >
        <Text style={{ color: '#eaddcf', fontSize: 16 }}>🏪  Market</Text>
        {coins > 0 && (
          <Text style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>Spend coins to unlock buildings</Text>
        )}
      </TouchableOpacity>

      {/* Decorative bottom rule */}
      <View style={{ width: 260, height: 2, backgroundColor: '#5c4033', marginTop: 28 }} />

      {/* Lore text */}
      <Text style={{ color: '#5c4033', fontSize: 10, marginTop: 14, textAlign: 'center', maxWidth: 280 }}>
        The Sacred Grail stands at the heart of your kingdom.{'\n'}Build towers, train soldiers, and repel the horde.
      </Text>

      <MarketModal visible={marketOpen} onClose={() => setMarketOpen(false)} />
    </View>
  );
}
