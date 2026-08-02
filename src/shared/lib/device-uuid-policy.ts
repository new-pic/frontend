interface StableDeviceUuidDependencies {
  read: () => Promise<string | null>;
  create: () => string;
  persist: (deviceUuid: string) => Promise<void>;
}

export async function resolveStableDeviceUuid({
  read,
  create,
  persist,
}: StableDeviceUuidDependencies) {
  const storedDeviceUuid = await read();
  if (storedDeviceUuid) {
    return storedDeviceUuid;
  }

  const newDeviceUuid = create();
  await persist(newDeviceUuid);
  return newDeviceUuid;
}
