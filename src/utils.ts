import {
  useCallback,
  useEffect,
  useState,
  type DependencyList,
  type SetStateAction,
} from "react";

type EffectFn = (signal: AbortSignal) => void | Promise<void>;

export const useSignalEffect = (fn: EffectFn, deps?: DependencyList) => {
  useEffect(() => {
    const controller = new AbortController();

    fn(controller.signal);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

interface UseAsyncReturnPending {
  status: "pending";
  value: undefined;
  error: undefined;
}

interface UseAsyncReturnResolved<T> {
  status: "resolved";
  value: T;
  error: undefined;
}

interface UseAsyncReturnError {
  status: "error";
  value: undefined;
  error: unknown;
}

type UseAsyncReturn<T> =
  | UseAsyncReturnPending
  | UseAsyncReturnResolved<T>
  | UseAsyncReturnError;

export const useAsync = <T>(f: () => Promise<T>, deps?: unknown[]) => {
  const [status, setStatus] = useState<"pending" | "error" | "resolved">(
    "pending",
  );
  const [value, setValue] = useState<Awaited<T> | undefined>();
  const [error, setError] = useState<unknown>();

  useSignalEffect(async (signal) => {
    try {
      const result = await f();
      setValue(result);
      setError(undefined);
      setStatus("resolved");
    } catch (e) {
      if (signal.aborted) {
        return;
      }
      setError(e);
      setStatus("error");
      setValue(undefined);
    }
  }, deps);

  return {
    status,
    value,
    error,
  } as UseAsyncReturn<Awaited<T>>;
};

export function useForm<T extends Record<string, any>>(
  defaults: T | (() => T),
) {
  const [state, setState] = useState<T>(defaults);
  const [ids] = useState(() => {
    const keys = Object.keys(state) as (keyof T)[];
    // @ts-ignore
    return generateIds<keyof T>(keys);
  });

  const onChange = useCallback(
    (partial: Partial<T> | ((old: T) => Partial<T>)) => {
      setState((old) => ({
        ...old,
        ...(typeof partial === "function" ? partial(old) : partial),
      }));
    },
    [],
  );

  return {
    ids,
    state,
    onChange,
  };
}

export function getClosest(value: number, array: number[]): number {
  return array.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value)
      ? current
      : closest;
  });
}

export function getClosestFramerate(framerate: number): number {
  const commonFramerates = [24, 25, 30, 50, 60, 90, 120];

  const closest = getClosest(framerate, commonFramerates);
  const difference = Math.abs(framerate - closest);

  if (difference > 5) {
    return Math.round(framerate);
  }

  return closest;
}

export function id(prefix?: string) {
  const rand = Math.random().toString(36).substring(2);
  if (prefix == null) {
    return rand;
  }
  return `${prefix}-${rand}`;
}

export function generateIds<T extends string>(
  prefixes: T[],
): Record<T, string> {
  return Object.fromEntries(
    prefixes.map((prefix) => [prefix, id(prefix)]),
  ) as Record<T, string>;
}

class AssertionError extends Error {}

export function assert(x: any, msg?: string): asserts x {
  if (!x) {
    throw new AssertionError(msg ?? "Assertion failed");
  }
}

export function formatBitrate(bitrate: number) {
  bitrate = bitrate / 1000;
  if (bitrate < 1000) {
    return `${bitrate.toFixed(2)}Kbps`;
  }
  bitrate = bitrate / 1000;
  return `${bitrate.toFixed(2)}Mbps`;
}

export function formatSize(size: number) {
  size = size / 1000;
  if (size < 1000) {
    return `${size.toFixed(2)}K`;
  }
  size = size / 1000;
  return `${size.toFixed(2)}M`;
}

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const entries = keys.map((k) => [k, obj[k]] as const);
  return Object.fromEntries(entries) as any;
}

export function normalizeDuration(x: number) {
  return Number(x.toFixed(3));
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}
