import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface ScreenSecurityPlugin {
  setSecure(options: { token: string; enabled: boolean }): Promise<void>;
}

let nativeScreenSecurity: ScreenSecurityPlugin | null = null;
let nextSecureScreenId = 0;

function getNativeScreenSecurity(): ScreenSecurityPlugin {
  nativeScreenSecurity ??= registerPlugin<ScreenSecurityPlugin>('ScreenSecurity');
  return nativeScreenSecurity;
}

export function useSecureScreen(enabled = true): void {
  const tokenRef = useRef<string | null>(null);
  tokenRef.current ??= `secure-screen-${++nextSecureScreenId}`;

  useEffect(() => {
    if (!enabled || Capacitor.getPlatform() !== 'android') return undefined;

    const plugin = getNativeScreenSecurity();
    const token = tokenRef.current;
    if (!token) return undefined;
    void plugin.setSecure({ token, enabled: true });

    return () => {
      void plugin.setSecure({ token, enabled: false });
    };
  }, [enabled]);
}
