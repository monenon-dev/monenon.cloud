export const HOME_MEETINGS_SAVED_EVENT = "moneo:home-meetings-saved";

export function dispatchHomeMeetingsSaved(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HOME_MEETINGS_SAVED_EVENT));
}
