import {
  Image as ExpoImage,
  type ImageProps as ExpoImageProps,
} from "expo-image";
import { useCssElement } from "react-native-css";

export type ImageProps = ExpoImageProps & {
  className?: string;
};

export function Image(props: ImageProps) {
  return useCssElement(ExpoImage, props, { className: "style" });
}

Image.displayName = "CSS(ExpoImage)";
