import { Modal, Text, TouchableOpacity, View } from 'react-native';

export function GameOverModal({
  visible,
  state,
  wave,
  coins,
  onRestart,
  onMenu,
}: {
  visible: boolean;
  state: 'victory' | 'defeat';
  wave: number;
  coins: number;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.78)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#eaddcf',
            borderWidth: 3,
            borderColor: '#5c4033',
            borderRadius: 16,
            padding: 32,
            width: 300,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#3e2723', fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>
            {state === 'victory' ? 'VICTORY' : '☠ FALLEN'}
          </Text>
          <Text style={{ color: '#5c4033', fontSize: 13, marginBottom: 18, textAlign: 'center' }}>
            {state === 'victory' ? 'The Sacred Grail is safe!' : 'The Sacred Grail has been taken…'}
          </Text>
          <View
            style={{
              backgroundColor: '#d4c5b0',
              borderRadius: 8,
              padding: 12,
              width: '100%',
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#3e2723', fontSize: 16, textAlign: 'center', marginBottom: 4 }}>
              Waves Survived: <Text style={{ fontWeight: 'bold' }}>{wave}</Text>
            </Text>
            <Text style={{ color: '#8B6914', fontSize: 16, textAlign: 'center' }}>
              Coins Earned: <Text style={{ fontWeight: 'bold' }}>⚜ {coins}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRestart}
            style={{
              backgroundColor: '#5c4033',
              borderRadius: 8,
              paddingHorizontal: 24,
              paddingVertical: 10,
              marginBottom: 8,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#eaddcf', fontWeight: 'bold', fontSize: 15 }}>⚔ Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMenu}
            style={{
              backgroundColor: '#3e2723',
              borderRadius: 8,
              paddingHorizontal: 24,
              paddingVertical: 10,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#eaddcf', fontSize: 13 }}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
