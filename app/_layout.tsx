import '../global.css';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * Render the app's root layout that provides gesture handling and hosts the navigation stack.
 *
 * @returns A JSX element that wraps the app's Stack navigator in a GestureHandlerRootView with screen headers hidden.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
