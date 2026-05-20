package com.taixiucanhan.app;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeBiometric")
public class NativeBiometricPlugin extends Plugin {
    private static final int AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        JSObject response = new JSObject();
        response.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("message", availabilityMessage(result));
        call.resolve(response);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        FragmentActivity activity = getActivity() instanceof FragmentActivity
            ? (FragmentActivity) getActivity()
            : null;

        if (activity == null) {
            call.reject("Biometric authentication is not available in this activity.");
            return;
        }

        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(availabilityMessage(result));
            return;
        }

        String title = call.getString("title", "Unlock Expense Tracker");
        String subtitle = call.getString("subtitle", "Verify before opening your encrypted database");

        activity.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(getContext()),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        call.reject(errString.toString());
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        JSObject response = new JSObject();
                        response.put("authenticated", true);
                        call.resolve(response);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        call.reject("Biometric authentication failed.");
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();

            prompt.authenticate(promptInfo);
        });
    }

    private String availabilityMessage(int result) {
        switch (result) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                return "Biometric authentication is available.";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "No biometric hardware is available on this device.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "Biometric hardware is currently unavailable.";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "No biometric credential has been enrolled on this device.";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "A security update is required before using biometric authentication.";
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                return "This biometric configuration is not supported on this device.";
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
            default:
                return "Biometric availability is unknown.";
        }
    }
}
