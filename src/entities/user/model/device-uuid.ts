import * as SecureStore from "expo-secure-store";

const DEVICE_UUID_KEY = "deviceUUID";

export const getAndCreateDeviceUUID = async (): Promise<string> => {
  try {
    let deviceUUID = await SecureStore.getItemAsync(DEVICE_UUID_KEY);
    if (!deviceUUID) {
      deviceUUID = crypto.randomUUID();
      await SecureStore.setItemAsync(DEVICE_UUID_KEY, deviceUUID);
    }
    return deviceUUID;
  } catch (error) {
    console.error("Error occurred while fetching device UUID:", error);
    return crypto.randomUUID();
  }
};
