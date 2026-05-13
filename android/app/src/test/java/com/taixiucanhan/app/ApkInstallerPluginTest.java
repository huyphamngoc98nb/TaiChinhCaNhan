package com.taixiucanhan.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import org.junit.Test;

public class ApkInstallerPluginTest {
    @Test
    public void installApkRejectsMissingFilePath() {
        ApkInstallerPlugin plugin = new ApkInstallerPlugin();
        TestPluginCall call = new TestPluginCall(null);

        plugin.installApk(call);

        assertTrue(call.rejected);
        assertFalse(call.resolved);
        assertEquals("filePath is required", call.rejectMessage);
    }

    @Test
    public void installApkRejectsNonExistingFile() {
        ApkInstallerPlugin plugin = new ApkInstallerPlugin();
        TestPluginCall call = new TestPluginCall("/tmp/not-found.apk");

        plugin.installApk(call);

        assertTrue(call.rejected);
        assertFalse(call.resolved);
        assertEquals("APK file does not exist", call.rejectMessage);
    }

    private static class TestPluginCall extends PluginCall {
        private boolean resolved = false;
        private boolean rejected = false;
        private String rejectMessage = "";
        private final String filePath;

        TestPluginCall(String filePath) {
            super(null, "ApkInstaller", "test-callback", "installApk", new JSObject());
            this.filePath = filePath;
        }

        @Override
        public String getString(String name) {
            if ("filePath".equals(name)) {
                return filePath;
            }
            return null;
        }

        @Override
        public void resolve(JSObject data) {
            resolved = true;
        }

        @Override
        public void resolve() {
            resolved = true;
        }

        @Override
        public void reject(String msg) {
            rejected = true;
            rejectMessage = msg;
        }

        @Override
        public void reject(String msg, Exception ex) {
            rejected = true;
            rejectMessage = msg;
        }
    }
}
