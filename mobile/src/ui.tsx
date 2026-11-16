import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts } from './theme';

export function T({ children, size = 14, weight = 'regular', color = colors.ink, style, numberOfLines, testID }: { children: ReactNode; size?: number; weight?: keyof typeof fonts; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; testID?: string }) {
  return <Text testID={testID} numberOfLines={numberOfLines} style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: size * (size >= 40 ? 1.2 : 1.45), color, letterSpacing: -size * .015, includeFontPadding: false }, style]}>{children}</Text>;
}
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.row, style]}>{children}</View>; }
export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) { return <View style={[{ gap }, style]}>{children}</View>; }
export function Card({ children, tone = 'white', style, onPress, label }: { children: ReactNode; tone?: 'white' | 'dark' | 'soft' | 'darkCard'; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const cardStyle = [s.card, { backgroundColor: { white: colors.white, dark: colors.ink, soft: colors.soft, darkCard: colors.darkCard }[tone] }, style];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [...cardStyle, pressed && s.pressed]}>{children}</Pressable> : <View style={cardStyle}>{children}</View>;
}
export function Button({ children, onPress, tone = 'blue', style, disabled, testID }: { children: ReactNode; onPress: () => void; tone?: 'blue' | 'white' | 'soft'; style?: StyleProp<ViewStyle>; disabled?: boolean; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled: !!disabled }} onPress={onPress} style={({ pressed }) => [s.button, { backgroundColor: tone === 'blue' ? colors.blue : tone === 'white' ? colors.white : colors.soft }, style, pressed && s.pressed, disabled && { opacity: .45 }]}><T weight="bold" color={tone === 'blue' ? 'white' : colors.ink} style={{ textAlign: 'center' }}>{children}</T></Pressable>;
}
export function TextAction({ children, onPress, light = false }: { children: ReactNode; onPress: () => void; light?: boolean }) { return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={s.textAction}><T size={11} weight="bold" color={light ? 'white' : colors.blue}>{children}</T></Pressable>; }
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) { return <Row><T size={18} weight="bold" style={{ flexShrink: 1 }}>{title}</T>{action && onPress && <TextAction onPress={onPress}>{action}</TextAction>}</Row>; }
export function Header({ title, back = true, onBack }: { title: string; back?: boolean; onBack?: () => void }) { return <Row style={{ minHeight: 44 }}><T size={back ? 18 : 26} weight="bold">{title}</T>{back && <TextAction onPress={onBack ?? (() => router.canGoBack() ? router.back() : router.replace('/'))}>뒤로</TextAction>}</Row>; }
export function Screen({ children, dark = false, footer, testID }: { children: ReactNode; dark?: boolean; footer?: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return <View testID={testID} style={[s.screen, { backgroundColor: dark ? colors.ink : colors.background, paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: footer ? 24 : Math.max(insets.bottom, 20) + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    {footer && <View style={[s.footer, { backgroundColor: dark ? colors.ink : colors.background, paddingBottom: Math.max(insets.bottom, 14) }]}>{footer}</View>}
  </View>;
}
export function Segments<T extends string | number>({ options, value, onChange, style }: { options: readonly T[]; value: T; onChange: (value: T) => void; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.segments, style]} accessibilityRole="tablist">{options.map(option => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)} style={[s.segment, value === option && s.segmentSelected]}><T size={11} weight={value === option ? 'bold' : 'medium'} color={value === option ? colors.ink : colors.muted}>{option}</T></Pressable>)}</View>;
}
export function Metrics({ items, light = false }: { items: [string, string][]; light?: boolean }) { return <Row style={{ gap: 8, alignItems: 'flex-start' }}>{items.map(([value, label]) => <View key={label} style={{ flex: 1, gap: 3, minHeight: 62, justifyContent: 'center' }}><T size={value.length > 6 ? 18 : 23} weight="bold" color={light ? 'white' : colors.ink} numberOfLines={1}>{value}</T><T size={11} color={light ? '#C1C9E2' : colors.muted}>{label}</T></View>)}</Row>; }
export function Runner({ rank, name, subtitle, value, me, onPress }: { rank: string; name: string; subtitle: string; value: string; me?: boolean; onPress?: () => void }) {
  const content = <><T size={rank.length > 4 ? 10 : 12} weight="bold" color={colors.blue} style={{ width: 38 }}>{rank}</T><Stack gap={2} style={{ flex: 1 }}><T size={13} weight="bold">{name}{me ? '  ·  나' : ''}</T><T size={10} color={colors.muted}>{subtitle}</T></Stack><T size={16} weight="bold">{value}</T></>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${name} ${value} 대결 보기`} onPress={onPress} style={({ pressed }) => [s.runner, me && s.me, pressed && s.pressed]}>{content}</Pressable> : <View style={[s.runner, me && s.me]}>{content}</View>;
}
export function Preference({ title, description, value, onChange }: { title: string; description?: string; value: boolean; onChange: () => void }) { return <Row style={{ gap: 12, minHeight: 48 }}><Stack gap={3} style={{ flex: 1 }}><T size={12} weight="medium">{title}</T>{description && <T size={10} color={colors.muted}>{description}</T>}</Stack><Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: colors.line, true: colors.blue }} thumbColor="white" /></Row>; }
const assets = {
  bell: require('../assets/figma/205c3.svg'), home: require('../assets/figma/29fa9.svg'),
  records: require('../assets/figma/c5f33.svg'), rank: require('../assets/figma/3d527.svg'),
  profile: require('../assets/figma/d4e44.svg'),
};
const activeIcons = { home: require('../assets/figma/ac1e5.svg'), profile: require('../assets/figma/69c50.svg') };
export function Icon({ name, active = false, size = 22 }: { name: keyof typeof assets; active?: boolean; size?: number }) {
  const source = active && (name === 'home' || name === 'profile') ? activeIcons[name] : assets[name];
  const dimensions = { bell: [16.8, 19.3, 24], home: [16.6751, 15.8, 21], records: [14.05, 14.925, 21], rank: [17.55, 14.05, 21], profile: [14.0503, 14.9252, 21] }[name];
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Image source={source} style={{ width: dimensions[0] * size / dimensions[2], height: dimensions[1] * size / dimensions[2] }} contentFit="contain" tintColor={active ? colors.blue : name === 'bell' ? colors.ink : colors.muted} accessible={false} /></View>;
}
export function Track() { return <Image testID="running-track" accessibilityLabel="나와 기록 속의 나를 비교하는 러닝 트랙" source={require('../assets/figma/44091.svg')} style={{ width: '100%', aspectRatio: 302 / 128 }} contentFit="contain" />; }
export function CourseMap() { return <Image testID="course-map" accessibilityLabel="러닝 코스 개략도" source={require('../assets/figma/81a73.svg')} style={{ width: '100%', aspectRatio: 302 / 180, borderRadius: 18 }} contentFit="contain" />; }
export function Legend({ onHistory }: { onHistory?: () => void }) { return <Row><Row style={{ justifyContent: 'flex-start', gap: 12 }}><T size={10} color="#95A1FF">● 나</T><T size={10} color={colors.pink}>● 기록 속의 나</T></Row>{onHistory && <TextAction onPress={onHistory} light>지난 기록</TextAction>}</Row>; }
export function Week() { return <Row style={{ gap: 5 }}>{[['일', '6.2'], ['월', '6'], ['화', '–'], ['수', '5'], ['목', '–'], ['금', '6'], ['토', '9']].map(([day, value]) => <View key={day} style={{ flex: 1, backgroundColor: day === '월' ? colors.blue : colors.background, borderRadius: 12, paddingVertical: 9, alignItems: 'center', gap: 4 }}><T size={10} color={day === '월' ? 'white' : colors.muted}>{day}</T><T size={12} weight="bold" color={day === '월' ? 'white' : colors.ink}>{value}</T></View>)}</Row>; }
const s = StyleSheet.create({ screen: { flex: 1 }, content: { paddingHorizontal: 24, paddingTop: 12, gap: 20 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, card: { borderRadius: 24, padding: 20, gap: 12 }, pressed: { opacity: .74, transform: [{ scale: .99 }] }, button: { minHeight: 54, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }, textAction: { minHeight: 40, justifyContent: 'center', paddingLeft: 8 }, footer: { paddingHorizontal: 24, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, segments: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 16, padding: 4, gap: 4 }, segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 2 }, segmentSelected: { backgroundColor: colors.white, boxShadow: '0px 1px 3px rgba(17,29,67,0.07)' }, runner: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 }, me: { backgroundColor: colors.soft, borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 } });
