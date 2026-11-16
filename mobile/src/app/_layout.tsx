import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';
import { NotoSansKR_900Black } from '@expo-google-fonts/noto-sans-kr/900Black';
import { DemoProvider } from '../state';
import { colors } from '../theme';

export default function Layout() {
  const [loaded, error] = useFonts({ NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_900Black });
  if (!loaded && !error) return <View style={styles.loading}><ActivityIndicator color={colors.blue} size="large" /></View>;
  return <SafeAreaProvider><View style={styles.outer}><View style={styles.app}><DemoProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}><Stack.Screen name="(tabs)" /><Stack.Screen name="active" options={{ gestureEnabled: false, animation: 'fade' }} /><Stack.Screen name="settings" options={{ presentation: 'modal' }} /></Stack></DemoProvider></View></View></SafeAreaProvider>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, outer: { flex: 1, backgroundColor: '#D5DDEB', alignItems: 'center' }, app: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, backgroundColor: colors.background, overflow: 'hidden' } });
