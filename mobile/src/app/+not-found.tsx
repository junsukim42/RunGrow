import React from 'react';
import { router } from 'expo-router';
import { Button, Screen, T } from '../ui';
export default function NotFound() { return <Screen><T size={26} weight="bold">길을 잠깐 벗어났어요.</T><T>홈에서 다시 나란히 달려볼까요?</T><Button onPress={() => router.replace('/')}>홈으로 돌아가기</Button></Screen>; }
