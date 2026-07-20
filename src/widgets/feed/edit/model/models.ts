import * as MediaLibrary from "expo-media-library";

export interface CustomAlbum {
  id: string;
  title: string;
  rawAlbum: MediaLibrary.Album | null; // 원본 객체도 나중에 Query 쓸 때 필요하니 보관
  isRecent?: boolean; // 최근 항목 여부를 나타내는 플래그
}

export interface ImageParams {
  id: string;
  imageUrl: string;
  fileName: string;
}
