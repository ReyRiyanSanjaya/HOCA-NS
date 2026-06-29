import type { OfflineQueueItem } from "@/types";
import { STORAGE_KEYS } from "./config";
import { getLocalStorage, setLocalStorage } from "./utils";

export function getOfflineQueue(): OfflineQueueItem[] {
  return getLocalStorage<OfflineQueueItem[]>(STORAGE_KEYS.offlineQueue, []);
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, "id" | "retryCount">): void {
  const queue = getOfflineQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    retryCount: 0,
  });
  setLocalStorage(STORAGE_KEYS.offlineQueue, queue);
}

export function removeFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  setLocalStorage(STORAGE_KEYS.offlineQueue, queue);
}

export function clearOfflineQueue(): void {
  setLocalStorage(STORAGE_KEYS.offlineQueue, []);
}

export function incrementRetry(id: string): void {
  const queue = getOfflineQueue().map((item) =>
    item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
  );
  setLocalStorage(STORAGE_KEYS.offlineQueue, queue);
}
