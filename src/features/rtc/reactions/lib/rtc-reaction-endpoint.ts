import { translate } from "../../../../shared/config";

export const getRtcReactionServerUrl = (apiUrl: string): string => {
  const normalizedApiUrl = apiUrl.trim();
  if (!normalizedApiUrl) {
    throw new Error(translate("rtc.reaction.missingEndpoint"));
  }

  try {
    return new URL(normalizedApiUrl).origin;
  } catch {
    throw new Error(translate("rtc.reaction.invalidEndpoint"));
  }
};
