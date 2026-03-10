import type React from 'react';
import { Text, View } from 'react-native';

interface BezelLayoutProps {
  children: React.ReactNode;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

export function BezelLayout({ children, topContent, bottomContent }: BezelLayoutProps) {
  return (
    <View className="flex-1 bg-[#2b1d14]">
      {/* Top Bezel */}
      {topContent && (
        <View className="border-b-2 border-[#5c4033] bg-[#2b1d14] px-4 py-2">
          <View className="bg-[#eaddcf] rounded px-3 py-1">{topContent}</View>
        </View>
      )}

      {/* Main Content */}
      <View className="flex-1 relative">{children}</View>

      {/* Bottom Bezel */}
      {bottomContent && (
        <View className="border-t-2 border-[#5c4033] bg-[#2b1d14] px-4 py-2">
          <View className="bg-[#eaddcf] rounded px-3 py-1">{bottomContent}</View>
        </View>
      )}
    </View>
  );
}

interface HUDStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function HUDStat({ label, value, color = '#3e2723' }: HUDStatProps) {
  return (
    <View className="flex-row items-center mr-4">
      <Text style={{ color: '#5c4033', fontSize: 10, marginRight: 2 }}>{label}</Text>
      <Text style={{ color, fontSize: 14, fontWeight: 'bold' }}>{value}</Text>
    </View>
  );
}
