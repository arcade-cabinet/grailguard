import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BUILDING_COST, type BuildingType } from '../../../engine/constants';

const BUILDING_EMOJI: Record<BuildingType, string> = {
  wall: '🧱',
  hut: '🏕',
  range: '🏹',
  temple: '⛪',
  keep: '🏰',
  turret: '⚙',
  ballista: '🏹',
  cannon: '💣',
  catapult: '🪵',
};

const BUILDING_NAME: Record<BuildingType, string> = {
  wall: 'Wall',
  hut: 'Hut',
  range: 'Range',
  temple: 'Temple',
  keep: 'Keep',
  turret: 'Turret',
  ballista: 'Ballista',
  cannon: 'Cannon',
  catapult: 'Catapult',
};

export function BottomHUD({
  selectedBuilding,
  onSelectBuilding,
  phase,
  onStartWave,
  smiteCd,
  onDivineSmite,
  onHealSpell,
  onFreezeSpell,
  gold,
  unlocks,
  gameSpeed,
  onSpeedToggle,
  autoGovernor,
  onAutoGovernorToggle,
}: {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (t: BuildingType) => void;
  phase: 'build' | 'defend';
  onStartWave: () => void;
  smiteCd: number;
  onDivineSmite: () => void;
  onHealSpell: () => void;
  onFreezeSpell: () => void;
  gold: number;
  unlocks: Record<BuildingType, boolean>;
  gameSpeed: number;
  onSpeedToggle: () => void;
  autoGovernor: boolean;
  onAutoGovernorToggle: () => void;
}) {
  const types: BuildingType[] = [
    'wall',
    'hut',
    'range',
    'temple',
    'keep',
    'turret',
    'ballista',
    'cannon',
    'catapult',
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        paddingHorizontal: 8,
        alignItems: 'center',
        paddingBottom: 4,
      }}
    >
      {/* Wave start or Smite/Spells based on phase */}
      <View style={{ marginRight: 16 }}>
        {phase === 'build' ? (
          <TouchableOpacity
            onPress={onStartWave}
            style={{
              backgroundColor: '#8b0000',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#ffaa00',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>START WAVE</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={onDivineSmite}
              disabled={smiteCd > 0}
              style={{
                backgroundColor: smiteCd > 0 ? '#555' : '#ffaa00',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: '#3e2723',
              }}
            >
              <Text style={{ color: smiteCd > 0 ? '#888' : '#3e2723', fontWeight: 'bold' }}>
                {smiteCd > 0 ? `Wait ${Math.ceil(smiteCd)}s` : '⚡ SMITE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onHealSpell}
              disabled={gold < 150}
              style={{
                backgroundColor: gold < 150 ? '#555' : '#22aa55',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: '#3e2723',
              }}
            >
              <Text style={{ color: gold < 150 ? '#888' : '#3e2723', fontWeight: 'bold' }}>
                💖 HEAL (150)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onFreezeSpell}
              disabled={gold < 100}
              style={{
                backgroundColor: gold < 100 ? '#555' : '#55ccff',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: '#3e2723',
              }}
            >
              <Text style={{ color: gold < 100 ? '#888' : '#3e2723', fontWeight: 'bold' }}>
                ❄ FREEZE (100)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {types
        .filter((t) => unlocks[t])
        .map((t) => {
          const cost = BUILDING_COST[t];
          const canAfford = gold >= cost;
          const isSelected = selectedBuilding === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => onSelectBuilding(t)}
              style={{
                backgroundColor: isSelected ? '#7a5540' : '#3e2723',
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? '#ffd700' : '#5c4033',
                borderRadius: 8,
                padding: 6,
                minWidth: 58,
                alignItems: 'center',
                opacity: canAfford ? 1 : 0.45,
                marginRight: 6,
              }}
            >
              <Text style={{ fontSize: 18 }}>{BUILDING_EMOJI[t]}</Text>
              <Text style={{ color: '#eaddcf', fontSize: 9 }}>{BUILDING_NAME[t]}</Text>
              <Text style={{ color: canAfford ? '#ffd700' : '#888', fontSize: 9 }}>{cost}g</Text>
            </TouchableOpacity>
          );
        })}

      <View style={{ width: 8 }} />

      {/* Speed Toggle */}
      <TouchableOpacity
        onPress={onSpeedToggle}
        style={{
          backgroundColor: '#2a1a10',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#5c4033',
          minWidth: 44,
          marginRight: 6,
        }}
      >
        <Text style={{ color: '#ffd700', fontSize: 14, fontWeight: 'bold' }}>{gameSpeed}×</Text>
        <Text style={{ color: '#aaa', fontSize: 8 }}>speed</Text>
      </TouchableOpacity>

      {/* Auto-Governor Toggle */}
      <TouchableOpacity
        onPress={onAutoGovernorToggle}
        style={{
          backgroundColor: autoGovernor ? '#22cc88' : '#2a1a10',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: autoGovernor ? '#11aa66' : '#5c4033',
        }}
      >
        <Text style={{ color: autoGovernor ? '#000' : '#ffd700', fontSize: 16 }}>🤖</Text>
        <Text style={{ color: autoGovernor ? '#000' : '#aaa', fontSize: 8 }}>AI Gov</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
