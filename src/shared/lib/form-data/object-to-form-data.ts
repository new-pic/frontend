import { File } from "expo-file-system";

function isExpoFile(value: unknown): value is File {
  if (typeof value !== "object" || value === null) return false;

  return (
    "uri" in value &&
    typeof value.uri === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "type" in value &&
    typeof value.type === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "exists" in value &&
    typeof value.exists === "boolean"
  );
}

export function ObjectToFormData(obj: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(obj)) {
    if (isExpoFile(value)) {
      if (!value.exists || value.size === 0) {
        throw new Error(`Cannot upload an empty file: ${value.name}`);
      }

      formData.append(key, value);
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  return formData;
}
