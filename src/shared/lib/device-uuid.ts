import * as crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { resolveStableDeviceUuid } from "./device-uuid-policy";

const DEVICE_UUID_KEY = "deviceUUID";

export const getAndCreateDeviceUUID = async (): Promise<string> => {
  try {
    return await resolveStableDeviceUuid({
      read: () => SecureStore.getItemAsync(DEVICE_UUID_KEY),
      create: () => crypto.randomUUID(),
      persist: (deviceUuid) =>
        SecureStore.setItemAsync(DEVICE_UUID_KEY, deviceUuid),
    });
  } catch (error) {
    console.error("Error occurred while fetching device UUID:", error);
    throw new Error("Device UUID is unavailable", {
      cause: error,
    });
  }
};
