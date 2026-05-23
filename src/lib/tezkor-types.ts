export type QuickListItem = {
  id: string;
  listId: string;
  text: string;
  done: boolean;
  order: number;
  createdAt: string;  // ISO
};

export type QuickList = {
  id: string;
  name: string;
  source: "bot" | "app";
  /** When set, list is closed (no longer accepting bot items). */
  closedAt?: string;
  /** Set when soft-deleted; auto-purged after 30 days. */
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: QuickListItem[];
};
