import { ROAM_ORIGINS } from '@/roam/constants';

/**
 * Asks Chrome for site access so the pet can walk on web pages. Must run inside the user's
 * click. A refusal or an error (no user gesture, dialog dismissed) reads as "not allowed".
 */
export async function requestRoamAccess(permissions: {
  request(p: { origins: string[] }): Promise<boolean>;
}): Promise<boolean> {
  try {
    return await permissions.request({ origins: [...ROAM_ORIGINS] });
  } catch {
    return false;
  }
}
