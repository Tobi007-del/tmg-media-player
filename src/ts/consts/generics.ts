// ============ Constants ============

export const FN_KEY = "tmg_fn_registry";

export const LUID_KEY = `tmg_local_${
  location.pathname
    .replace(/\.html/g, "")
    .match(/[a-z0-9]+/g)
    ?.join("_") || "root"
}_uid`;
