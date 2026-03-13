import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { db } from './client';
import { ensureSeedData } from './meta';
import { migrations } from './migrations';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { error, success } = useMigrations(db, migrations);

  useEffect(() => {
    if (success) {
      void ensureSeedData();
    }
  }, [success]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#120b08] px-6">
        <Text className="text-4xl font-bold text-[#d4af37]">Database Error</Text>
        <Text className="mt-3 text-center text-base text-[#d7c6af]">{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-[#120b08]">
        <Text className="text-5xl font-bold text-[#d4af37]">Grailguard</Text>
        <Text className="mt-3 text-lg text-[#d7c6af]">Sanctifying the archives...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
