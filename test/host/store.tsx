// 호스트가 연합으로 내보내는 표면의 대역이며 시험 실행에서만 쓰인다.

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { GuidanceBundle } from "tracerWeb/guidance";
import type { GuidanceLocaleSlice, UiStoreApi } from "tracerWeb/store";
import { GUIDANCE_CATALOG } from "./guidance.js";

export function createUiStore(_options?: { readonly persisted?: boolean }): UiStoreApi {
  const listeners = new Set<() => void>();
  let state: GuidanceLocaleSlice = {
    guidanceLocale: "en",
    setGuidanceLocale: (locale) => {
      state = { ...state, guidanceLocale: locale };
      for (const listener of listeners) listener();
    },
  };
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const StoreContext = createContext<UiStoreApi>(createUiStore());

export function UiStoreProvider({
  store,
  children,
}: {
  readonly store: UiStoreApi;
  readonly children: ReactNode;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useGuidance(): GuidanceBundle {
  const store = useContext(StoreContext);
  const locale = useSyncExternalStore(store.subscribe, () => store.getState().guidanceLocale);
  return { locale, messages: GUIDANCE_CATALOG };
}
