import { RTC_MAX_SELECTED_PHOTOS } from "@entities/rtc";
import { uriToFile } from "@shared/lib";
import type { File } from "expo-file-system";

export interface RtcEndPhotoInput {
  uri: string;
}

export async function prepareRtcEndImages(
  photos: readonly RtcEndPhotoInput[],
): Promise<File[]> {
  if (photos.length > RTC_MAX_SELECTED_PHOTOS) {
    throw new Error(
      `저장할 사진은 최대 ${RTC_MAX_SELECTED_PHOTOS}장까지 선택할 수 있습니다.`,
    );
  }

  try {
    return await Promise.all(photos.map(({ uri }) => uriToFile({ uri })));
  } catch {
    throw new Error(
      "선택한 사진 파일을 준비하지 못했습니다. 사진을 다시 선택해주세요.",
    );
  }
}
