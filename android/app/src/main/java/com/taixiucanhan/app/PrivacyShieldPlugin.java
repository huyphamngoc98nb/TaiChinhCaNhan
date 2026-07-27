package com.taixiucanhan.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PrivacyShield")
public class PrivacyShieldPlugin extends Plugin {
    @PluginMethod
    public void hide(PluginCall call) {
        if (getActivity() instanceof MainActivity) {
            getActivity().runOnUiThread(() -> {
                ((MainActivity) getActivity()).hidePrivacyShield();
                call.resolve();
            });
            return;
        }

        call.reject("Privacy Shield is unavailable in this activity.");
    }
}
