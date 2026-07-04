import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "../alert-dialog";
import { Button, ButtonText } from "../button";
import { Text } from "../text";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  handleCancel: () => void;
  handleConfirm: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "예",
  cancelText = "아니오",
  handleCancel,
  handleConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      isOpen={isOpen}
      onClose={handleCancel}
      closeOnOverlayClick={false}
    >
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Text className="text-lg font-semibold">{title}</Text>
        </AlertDialogHeader>
        <AlertDialogBody className="mb-10">
          <Text className="text-sm mt-1 text-label-muted">{message}</Text>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button className="flex-1" variant="outline" onPress={handleCancel}>
            <ButtonText>{cancelText}</ButtonText>
          </Button>
          <Button
            className="flex-1 p-0"
            variant="gradient"
            onPress={handleConfirm}
          >
            <ButtonText>{confirmText}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
