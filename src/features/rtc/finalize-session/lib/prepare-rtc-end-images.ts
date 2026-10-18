import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc-room";
import { uriToFile } from "@shared/lib";
import type { File } from "expo-file-system";
import { translate } from "../../../../shared/config";

export interface RtcEndPhotoInput {
  uri: string;
}

export async function prepareRtcEndImages(
  photos: readonly RtcEndPhotoInput[],
): Promise<File[]> {
  if (photos.length > RTC_MAX_SELECTED_PHOTOS) {
    throw new Error(
      translate("rtc.result.roomSelectionLimit", {
        count: RTC_MAX_SELECTED_PHOTOS,
      }),
    );
  }

  try {
    return await Promise.all(photos.map(({ uri }) => uriToFile({ uri })));
  } catch {
    throw new Error(translate("rtc.result.prepareFailed"));
  }
}
