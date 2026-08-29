import {
  Button,
  ButtonIcon,
  HStack,
  Pressable,
  Text,
  VStack,
} from "@shared/ui";
import { IconCameraRotate } from "@tabler/icons-react-native";
import { Image } from "react-native";
import { SessionPhoto } from "../model/models";

/**
 * @type CameraControlsProps
 * @description 카메라 촬영 버튼과 전후면 전환 버튼을 담당하는 컴포넌트
 * @note 실제 카메라와 무거운 훅들을 담당하는 CameraView 내부에서만 사용됩니다.
 */
interface CameraControlsProps {
  thumbnail?: SessionPhoto | null;
  isTakePhotoDisabled?: boolean;
  onThumbnailPress?: () => void;
  onTakePhoto: () => void;
  onChangePosition: () => void;
}

export function CameraControls({
  thumbnail,
  isTakePhotoDisabled = false,
  onThumbnailPress,
  onTakePhoto,
  onChangePosition,
}: CameraControlsProps) {
  return (
    <VStack className="w-full py-6 px-6 pb-12 bg-white">
      <HStack className="items-center justify-around">
        <Pressable
          disabled={!thumbnail || !onThumbnailPress}
          onPress={onThumbnailPress}
          accessibilityRole="button"
          accessibilityLabel={
            thumbnail ? "촬영한 사진 목록 열기" : "촬영한 사진 없음"
          }
          accessibilityState={{ disabled: !thumbnail }}
        >
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail.uri }}
              style={{ width: 50, height: 50, borderRadius: 8 }}
            />
          ) : (
            <VStack
              className="w-12 h-12 rounded-lg items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <Text className="text-white text-xs">최근 사진</Text>
            </VStack>
          )}
        </Pressable>
        <Button
          variant="outline"
          className="w-20 h-20 rounded-full"
          disabled={isTakePhotoDisabled}
          onPress={onTakePhoto}
          accessibilityLabel={
            isTakePhotoDisabled ? "사진 촬영 한도에 도달함" : "사진 촬영"
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onPress={onChangePosition}
          accessibilityLabel="전후면 카메라 전환"
        >
          <ButtonIcon className="w-8 h-8" as={IconCameraRotate} />
        </Button>
      </HStack>
    </VStack>
  );
}
