import {
  UpdateProfileRequest,
  UpdateProfileRequestSchema,
} from "@entities/profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export type UseSetupFormReturn = ReturnType<typeof useSetupForm>;

export function useSetupForm() {
  return useForm<UpdateProfileRequest>({
    resolver: zodResolver(UpdateProfileRequestSchema),
    defaultValues: {
      nickname: "",
    },
  });
}
