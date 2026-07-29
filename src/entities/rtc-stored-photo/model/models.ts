import { z } from "zod";
import {
  RtcStoredPhotoListParamsSchema,
  RtcStoredPhotoListResponseSchema,
  RtcStoredPhotoSchema,
} from "./schema";

export type RtcStoredPhoto = z.infer<typeof RtcStoredPhotoSchema>;

export type RtcStoredPhotoListParams = z.input<
  typeof RtcStoredPhotoListParamsSchema
>;

export type RtcStoredPhotoListResponse = z.infer<
  typeof RtcStoredPhotoListResponseSchema
>;

export interface RtcRoomStoredPhotoListParams
  extends RtcStoredPhotoListParams {
  roomId: string;
}
