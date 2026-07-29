import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useUiPersonalizationSettings } from '@/shared/hooks/useUiPersonalizationSettings';
import { getStartupScreenRoute } from '@/shared/utils/startup-screen';
import { notificationReminders } from '@/modules/settings/services/notification-reminders';
import { logger } from '@/core/telemetry/logger';

const STARTUP_REDIRECT_APPLIED_KEY = 'ui.startup_screen_redirect_applied';

function hasStartupRedirectBeenApplied(): boolean {
  try {
    return sessionStorage.getItem(STARTUP_REDIRECT_APPLIED_KEY) === 'true';
  } catch {
    return true;
  }
}

function markStartupRedirectApplied(): void {
  try {
    sessionStorage.setItem(STARTUP_REDIRECT_APPLIED_KEY, 'true');
  } catch {
    // Treat storage failures conservatively: do not keep attempting redirects.
  }
}

export function StartupScreenRedirector() {
  const { startupScreen } = useUiPersonalizationSettings();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let removeRouteListener: (() => Promise<void>) | undefined;

    const applyPendingNotificationRoute = async () => {
      try {
        const route = await notificationReminders.consumePendingRoute();
        if (!mounted || !route) return false;
        markStartupRedirectApplied();
        navigate(route, { replace: true });
        return true;
      } catch (error) {
        logger.warn('Unable to consume notification route', error);
        return false;
      }
    };

    async function initializeRedirect() {
      const listener = await notificationReminders.addRouteListener(() => {
        void applyPendingNotificationRoute();
      });
      removeRouteListener = listener ? () => listener.remove() : undefined;

      if (await applyPendingNotificationRoute()) return;
      if (hasStartupRedirectBeenApplied()) return;

      const isInitialHomeRoute = location.pathname === ROUTES.HOME;
      markStartupRedirectApplied();
      if (!isInitialHomeRoute) return;

      const targetRoute = getStartupScreenRoute(startupScreen);
      if (targetRoute !== location.pathname && mounted) {
        navigate(targetRoute, { replace: true });
      }
    }

    void initializeRedirect();
    return () => {
      mounted = false;
      if (removeRouteListener) void removeRouteListener();
    };
  }, [location.pathname, navigate, startupScreen]);

  return null;
}
