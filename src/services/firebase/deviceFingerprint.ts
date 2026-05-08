import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const INSTALL_ID_KEY = 'huuwa_install_id_v1';

let cachedInstallId: string | null = null;

async function getOrCreateInstallId(): Promise<string> {
  if (cachedInstallId) return cachedInstallId;
  const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (existing) {
    cachedInstallId = existing;
    return existing;
  }
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  cachedInstallId = id;
  return id;
}

function buildDeviceLabel(): string {
  const model = Device.modelName ?? Device.deviceName ?? 'Unknown device';
  const os = Device.osName ?? Platform.OS;
  const version = Device.osVersion ?? '';
  return version ? `${model} / ${os} ${version}` : `${model} / ${os}`;
}

export interface DeviceInfo {
  deviceHash: string;
  deviceLabel: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const installId = await getOrCreateInstallId();
  return {
    deviceHash: installId,
    deviceLabel: buildDeviceLabel(),
  };
}
