/** Keep keyboard focus inside an open dialog and restore it on dismissal. */
export function trapDialogFocus(root: HTMLElement) {
  const previous = document.activeElement as HTMLElement | null;
  const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
  )).filter(el => el.getClientRects().length > 0);
  focusable()[0]?.focus();
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const items = focusable();
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
      event.preventDefault(); first?.focus();
    }
  };
  document.addEventListener("keydown", key);
  return () => {
    document.removeEventListener("keydown", key);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
}
