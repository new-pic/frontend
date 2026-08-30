export const verifyRtcId = (value: string, label: string): string => {
  const id = value.trim();
  if (!id) throw new Error(`${label}이(가) 없습니다.`);
  return id;
};
