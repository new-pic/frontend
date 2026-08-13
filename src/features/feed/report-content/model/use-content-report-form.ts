import {
  ContentReportFormValues,
  CreateContentReportRequest,
  CreateContentReportRequestSchema,
} from "@entities/feed";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";

export function useContentReportForm() {
  return useForm<
    ContentReportFormValues,
    unknown,
    CreateContentReportRequest
  >({
    resolver: standardSchemaResolver(CreateContentReportRequestSchema),
    defaultValues: {
      description: "",
    },
  });
}
