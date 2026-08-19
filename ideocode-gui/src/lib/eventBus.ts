type Listener = (data: unknown) => void;
const listeners = new Map<string, Listener[]>();

export const eventBus = {
  on(event: string, fn: Listener) {
    const list = listeners.get(event) ?? [];
    list.push(fn);
    listeners.set(event, list);
    return () => {
      const l = listeners.get(event);
      if (l) listeners.set(event, l.filter((f) => f !== fn));
    };
  },
  emit(event: string, data: unknown) {
    for (const fn of listeners.get(event) ?? []) fn(data);
  },
};
