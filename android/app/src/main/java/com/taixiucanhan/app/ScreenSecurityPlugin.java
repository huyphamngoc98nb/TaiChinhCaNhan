package com.taixiucanhan.app;

import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "ScreenSecurity")
public class ScreenSecurityPlugin extends Plugin {
    private final Set<String> secureTokens = new HashSet<>();

    @PluginMethod
    public synchronized void setSecure(PluginCall call) {
        String token = call.getString("token");
        Boolean enabled = call.getBoolean("enabled", false);
        if (token == null || token.trim().isEmpty()) {
            call.reject("A secure screen token is required.");
            return;
        }

        if (Boolean.TRUE.equals(enabled)) {
            secureTokens.add(token);
        } else {
            secureTokens.remove(token);
        }
        boolean shouldBeSecure = !secureTokens.isEmpty();

        getActivity().runOnUiThread(() -> {
            if (shouldBeSecure) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }
}
