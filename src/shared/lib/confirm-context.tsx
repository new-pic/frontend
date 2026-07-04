import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { ConfirmDialog } from "../ui/confirm-dialog";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });
  const resolveRef = useRef<(value: boolean) => void | null>(null);

  const openConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef.current?.(false);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef.current?.(true);
  };

  return (
    <ConfirmContext.Provider value={{ openConfirm }}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        handleCancel={handleCancel}
        handleConfirm={handleConfirm}
        {...options}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.openConfirm;
}
