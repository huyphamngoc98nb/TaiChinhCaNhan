package com.taixiucanhan.app;

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceLock")
public class DeviceLockPlugin extends Plugin {
    private static final String PREFS_NAME = "app_lock_lifecycle";
    private static final String DEVICE_WAS_LOCKED_KEY = "device_was_locked";

    private final BroadcastReceiver screenOffReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                getPreferences().edit().putBoolean(DEVICE_WAS_LOCKED_KEY, true).apply();
            }
        }
    };
    private boolean receiverRegistered;

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(screenOffReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(screenOffReceiver, filter);
        }
        receiverRegistered = true;
    }

    @PluginMethod
    public void consumeDeviceLockSignal(PluginCall call) {
        SharedPreferences preferences = getPreferences();
        boolean recordedScreenOff = preferences.getBoolean(DEVICE_WAS_LOCKED_KEY, false);
        boolean keyguardLocked = isKeyguardLocked();
        preferences.edit().remove(DEVICE_WAS_LOCKED_KEY).apply();

        JSObject response = new JSObject();
        response.put("deviceWasLocked", recordedScreenOff || keyguardLocked);
        call.resolve(response);
    }

    @PluginMethod
    public void clearDeviceLockSignal(PluginCall call) {
        getPreferences().edit().remove(DEVICE_WAS_LOCKED_KEY).apply();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (receiverRegistered) {
            try {
                getContext().unregisterReceiver(screenOffReceiver);
            } catch (IllegalArgumentException ignored) {
                // The system may already have detached the receiver.
            }
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }

    private boolean isKeyguardLocked() {
        KeyguardManager keyguardManager =
                (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        return keyguardManager != null && keyguardManager.isKeyguardLocked();
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
