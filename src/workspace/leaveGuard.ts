/**
 * "Unsaved changes" guard shared by the sheet editor and the navbar parts that navigate on their own
 * (notification and People links, which bypass the anchor-click check the editor installs).
 */
export const leaveGuard = {
  active: false,
  message: 'You have unsaved changes in this sheet. If you leave now they will be lost.',
};

/** True when it is fine to leave: nothing unsaved, or the user agreed. */
export function confirmLeave(): boolean {
  return !leaveGuard.active || window.confirm(`${leaveGuard.message}\n\nLeave anyway?`);
}
