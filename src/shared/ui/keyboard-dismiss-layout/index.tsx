import { Keyboard, TouchableWithoutFeedback } from "react-native";

export function KeyboardDismissLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}
