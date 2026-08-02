import { File, Paths } from "expo-file-system";

export interface UriToFileProps {
  uri: string;
  fileName?: string;
}

export interface StagedUploadFile {
  uri: string;
  fileName?: string;
  isTemporary: boolean;
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

export async function stageFileForUpload({
  uri,
  fileName,
}: UriToFileProps): Promise<StagedUploadFile> {
  if (!fileName) {
    return { uri, isTemporary: false };
  }

  const file = await uriToFile({ uri, fileName });
  return {
    uri: file.uri,
    fileName,
    isTemporary: true,
  };
}

export function deleteStagedUploadFile(file: StagedUploadFile) {
  if (!file.isTemporary) return;

  try {
    const target = new File(file.uri);
    if (target.exists) target.delete();
  } catch {
    // 임시 파일 정리는 게시 결과와 독립적으로 best-effort로 수행합니다.
  }
}
