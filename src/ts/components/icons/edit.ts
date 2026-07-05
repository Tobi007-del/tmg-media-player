export const edit = `<svg viewBox="0 0 24 24" class="tmg-media-edit-icon" stroke-width="1.5" stroke="currentColor" fill="none"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L6.998 19.716l-4.25.944.944-4.25L16.862 3.487z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    edit: typeof edit;
  }
}
