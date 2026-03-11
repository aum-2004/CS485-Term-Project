export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  commentCount: number;
}

export interface ThreadRow {
  id: string;
  title: string;
  created_at: Date;
  comment_count: string; // pg returns COUNT as string
}
