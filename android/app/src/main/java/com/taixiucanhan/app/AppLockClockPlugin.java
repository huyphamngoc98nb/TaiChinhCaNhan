package com.taixiucanhan.app;

import android.os.SystemClock;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppLockClock")
public class AppLockClockPlugin extends Plugin {
    @PluginMethod
    public void getElapsedRealtime(PluginCall call) {
        JSObject response = new JSObject();
        response.put("elapsedRealtime", SystemClock.elapsedRealtime());
        call.resolve(response);
    }
}
