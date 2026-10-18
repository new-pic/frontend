export const verifyRtcId = (value: string, errorMessage: string): string => {
  const id = value.trim();
  if (!id) throw new Error(errorMessage);
  return id;
};
