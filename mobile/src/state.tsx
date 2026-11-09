import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { courses, type RunMode } from './data';
import { colors, fonts } from './theme';

type Preferences = { voice: boolean; splits: boolean; opponent: boolean; notifications: boolean; publicProfile: boolean };
type DemoState = {
  name: string; setName: (name: string) => void;
  mode: RunMode; setMode: (mode: RunMode) => void;
  distance: number; setDistance: (distance: number) => void;
  courseId: string; setCourseId: (id: string) => void;
  preferences: Preferences; toggle: (key: keyof Preferences) => void;
  saved: boolean; save: () => void;
  toast: (message: string) => void;
};
const Context = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState('지호');
  const [mode, setMode] = useState<RunMode>('ghost');
  const [distance, setDistance] = useState(5);
  const [courseId, setCourseId] = useState<string>(courses[0].id);
  const [preferences, setPreferences] = useState<Preferences>({ voice: true, splits: true, opponent: true, notifications: true, publicProfile: false });
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const toast = useCallback((value: string) => {
    if (timeout.current) clearTimeout(timeout.current);
    setMessage(value);
    timeout.current = setTimeout(() => setMessage(''), 2800);
  }, []);
  const toggle = (key: keyof Preferences) => setPreferences(current => ({ ...current, [key]: !current[key] }));
  const save = () => { setSaved(true); toast('데모 기록을 저장했어요. 기록 탭에서 확인해 보세요.'); };
  return <Context.Provider value={{ name, setName, mode, setMode, distance, setDistance, courseId, setCourseId, preferences, toggle, saved, save, toast }}>
    {children}
    {!!message && <View pointerEvents="none" style={[styles.toast, { bottom: Math.max(insets.bottom, 16) + 82 }]} accessibilityLiveRegion="polite"><Text style={styles.message}>{message}</Text></View>}
  </Context.Provider>;
}
export function useDemo() { const state = useContext(Context); if (!state) throw new Error('DemoProvider is required'); return state; }
export function useCourse() { const { courseId } = useDemo(); return courses.find(course => course.id === courseId) ?? courses[0]; }
const styles = StyleSheet.create({ toast: { position: 'absolute', left: 24, right: 24, backgroundColor: colors.ink, borderRadius: 16, padding: 16, zIndex: 100 }, message: { color: 'white', fontFamily: fonts.medium, fontSize: 12, lineHeight: 20, textAlign: 'center' } });
