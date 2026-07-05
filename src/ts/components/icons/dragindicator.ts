export const dragindicator = `<svg fill="currentColor" height="20px" width="20px" viewBox="0 0 24 24" style="scale: 0.6"><path d="M10,6H6V2h4V6z M18,2h-4v4h4V2z M10,10H6v4h4V10z M18,10h-4v4h4V10z M10,18H6v4h4V18z M18,18h-4v4h4V18z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    dragindicator: typeof dragindicator;
  }
}
