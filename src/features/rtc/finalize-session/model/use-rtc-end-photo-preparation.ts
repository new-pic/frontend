import type { File } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { prepareRtcEndImages } from "../lib/prepare-rtc-end-images";
import type { RtcEndSelectablePhoto } from "./models";

interface PhotoSelectionRequest {
  resolve: (photos: RtcEndSelectablePhoto[]) => void;
  reject: (reason: Error) => void;
}

export function useRtcEndPhotoPreparation() {
  const selectionRequestRef = useRef<PhotoSelectionRequest | null>(null);
  const selectedPhotosRef = useRef<RtcEndSelectablePhoto[] | null>(null);
  const preparedImagesRef = useRef<File[] | null>(null);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  useEffect(() => {
    return () => {
      selectionRequestRef.current?.reject(
        new Error("화면을 벗어나 사진 선택이 취소되었습니다."),
      );
      selectionRequestRef.current = null;
    };
  }, []);

  const preparePhotos = useCallback(async () => {
    if (preparedImagesRef.current) return;

    if (!selectedPhotosRef.current) {
      selectedPhotosRef.current = await new Promise<RtcEndSelectablePhoto[]>(
        (resolve, reject) => {
          selectionRequestRef.current = { resolve, reject };
          setIsSelectionOpen(true);
        },
      );
    }

    preparedImagesRef.current = await prepareRtcEndImages(
      selectedPhotosRef.current,
    );
  }, []);

  const confirmSelection = useCallback(
    (selectedPhotos: RtcEndSelectablePhoto[]) => {
      const request = selectionRequestRef.current;
      if (!request) return;

      selectionRequestRef.current = null;
      selectedPhotosRef.current = selectedPhotos;
      preparedImagesRef.current = null;
      setIsSelectionOpen(false);
      request.resolve(selectedPhotos);
    },
    [],
  );

  const reset = useCallback(() => {
    selectionRequestRef.current?.reject(
      new Error("RTC 사진 선택이 취소되었습니다."),
    );
    selectionRequestRef.current = null;
    selectedPhotosRef.current = null;
    preparedImagesRef.current = null;
    setIsSelectionOpen(false);
  }, []);

  const getPreparedImages = useCallback(() => {
    if (!preparedImagesRef.current) {
      throw new Error("방에 저장할 사진 준비를 완료하지 못했습니다.");
    }

    return preparedImagesRef.current;
  }, []);

  const getSelectedPhotos = useCallback(
    () => selectedPhotosRef.current ?? [],
    [],
  );

  return {
    isSelectionOpen,
    preparePhotos,
    confirmSelection,
    getPreparedImages,
    getSelectedPhotos,
    reset,
  };
}
