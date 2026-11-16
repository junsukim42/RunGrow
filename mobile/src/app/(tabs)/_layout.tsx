import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, T } from '../../ui';
import { colors } from '../../theme';

const items = [{ route: 'index', label: '홈', icon: 'home' }, { route: 'records', label: '기록', icon: 'records' }, { route: 'run', label: '달리기', icon: null }, { route: 'ranking', label: '순위', icon: 'rank' }, { route: 'profile', label: '내 정보', icon: 'profile' }] as const;
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }} tabBar={({ state, navigation }) => <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{items.map(item => {
    const route = state.routes.find(route => route.name === item.route)!;
    const selected = state.routes[state.index]?.name === item.route;
    const go = () => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigation.navigate(route.name); };
    return <Pressable key={item.route} accessibilityRole="tab" accessibilityLabel={`${item.label} 탭`} accessibilityState={{ selected }} onPress={go} style={({ pressed }) => [s.item, pressed && { opacity: .65 }]}>{item.icon ? <><Icon name={item.icon} active={selected} size={21} /><T size={10} weight={selected ? 'bold' : 'medium'} color={selected ? colors.blue : colors.muted}>{item.label}</T></> : <View style={s.run}><T size={12} weight="bold" color="white">달리기</T></View>}</Pressable>;
  })}</View>}><Tabs.Screen name="index" /><Tabs.Screen name="records" /><Tabs.Screen name="run" /><Tabs.Screen name="ranking" /><Tabs.Screen name="profile" /></Tabs>;
}
const s = StyleSheet.create({ bar: { flexDirection: 'row', backgroundColor: colors.white, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, item: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4 }, run: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: -6, boxShadow: '0px 4px 12px rgba(55,71,255,0.18)' } });
