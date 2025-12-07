type LiftDeletedListener = (liftId: string) => void;

const deletedListeners = new Set<LiftDeletedListener>();

export function emitLiftDeleted(liftId: string): void {
  deletedListeners.forEach((fn) => {
    try {
      fn(liftId);
    } catch (_) {}
  });
}

export function subscribeLiftDeleted(listener: LiftDeletedListener): () => void {
  deletedListeners.add(listener);
  return () => {
    deletedListeners.delete(listener);
  };
}
