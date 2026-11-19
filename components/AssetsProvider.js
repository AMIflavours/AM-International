"use client";

import { createContext, useContext } from "react";
import { ASSET_DEFAULTS } from "@/lib/mediaShared";

// The site pictures and videos set in the admin. Without a provider the shipped defaults are used.
const AssetsContext = createContext(ASSET_DEFAULTS);

export function AssetsProvider({ assets, children }) {
  return <AssetsContext.Provider value={{ ...ASSET_DEFAULTS, ...assets }}>{children}</AssetsContext.Provider>;
}

export function useAssets() {
  return useContext(AssetsContext);
}
