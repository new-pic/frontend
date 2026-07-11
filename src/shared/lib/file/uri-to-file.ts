import { File, Paths } from "expo-file-system";

export interface UriToFileProps {
  uri: string;
  fileName?: string;
}

export async function uriToFile({
  uri,
  fileName,
}: UriToFileProps): Promise<File> {
  const source = new File(uri);
  if (!fileName) return source;

  const uploadFile = new File(Paths.cache, `${Date.now()}-${fileName}`);
  await source.copy(uploadFile);

  return uploadFile;
}
