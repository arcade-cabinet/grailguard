import type React from 'react';
import { Text, View } from 'react-native';

interface BezelLayoutProps {
  children: React.ReactNode;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}

/**
 * Layout component that renders optional top and bottom bezel sections around main content.
 *
 * Renders a full-height container with an optional top bezel, a flexible main content area, and an optional bottom bezel. Top and bottom bezels are visually separated with borders and contain their respective provided content.
 *
 * @param children - Main content rendered inside the central flexible area
 * @param topContent - Optional content rendered inside the top bezel; when omitted the top bezel is not rendered
 * @param bottomContent - Optional content rendered inside the bottom bezel; when omitted the bottom bezel is not rendered
 * @returns The React element representing the bezel layout
 */
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

/**
 * Renders a compact inline statistic consisting of a label and a prominently styled value.
 *
 * @param label - Short text label shown to the left of the value
 * @param value - The statistic value to display
 * @param color - Text color for the value; defaults to `'#3e2723'`
 * @returns A React element containing the label and value arranged horizontally
 */
export function HUDStat({ label, value, color = '#3e2723' }: HUDStatProps) {
  return (
    <View className="flex-row items-center mr-4">
      <Text style={{ color: '#5c4033', fontSize: 10, marginRight: 2 }}>{label}</Text>
      <Text style={{ color, fontSize: 14, fontWeight: 'bold' }}>{value}</Text>
    </View>
  );
}
