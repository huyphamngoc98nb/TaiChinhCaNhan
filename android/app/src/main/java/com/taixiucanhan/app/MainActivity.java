package com.taixiucanhan.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometricPlugin.class);
        registerPlugin(DocumentSaverPlugin.class);
        registerPlugin(HapticFeedbackPlugin.class);
        registerPlugin(SecureSecretStorePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
