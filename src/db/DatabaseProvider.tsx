/**
 * @module DatabaseProvider
 *
 * React context provider that gates the component tree behind successful
 * database migration and seed-data initialisation.  Wrap the app root with
 * `<DatabaseProvider>` to guarantee every downstream component can safely
 * query the database.
 */
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { db } from './client';
import { ensureSeedData } from './meta';
import { migrations } from './migrations';

/**
 * Runs Drizzle migrations on mount, seeds default data on success, and
 * renders either an error screen, a loading splash, or the child tree.
 *
 * @param props.children - Application component tree to render once the database is ready.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { error, success } = useMigrations(db, migrations);
  const [seedComplete, setSeedComplete] = useState(false);

  useEffect(() => {
    if (success) {
      ensureSeedData()
        .then(() => setSeedComplete(true))
        .catch((err) => console.error('Seed data error:', err));
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

  if (!success || !seedComplete) {
    return (
      <View className="flex-1 items-center justify-center bg-[#120b08]">
        <Text className="text-5xl font-bold text-[#d4af37]">Grailguard</Text>
        <Text className="mt-3 text-lg text-[#d7c6af]">Sanctifying the archives...</Text>
      </View>
    );
  }

  return <>{children}</>;
}