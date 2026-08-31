export interface BlockedUser {
  id: string;
  createdAt: string;
  blockedUser: {
    id: string;
    nickname: string;
    profileImage: string | null;
  };
}

export interface BlockedUserListResponse {
  items: BlockedUser[];
  nextCursor?: string | null;
}
