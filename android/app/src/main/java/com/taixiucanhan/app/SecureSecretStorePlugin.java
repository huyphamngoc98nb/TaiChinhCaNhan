package com.taixiucanhan.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSecretStore")
public class SecureSecretStorePlugin extends Plugin {
    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String KEY_ALIAS = "TaiXiuCaNhanSecureSecretStoreKey";
    private static final String PREFS_NAME = "secure_secret_store";
    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;

    @PluginMethod
    public void setSecret(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");

        if (!isValidKey(key)) {
            call.reject("Secret key is required.");
            return;
        }

        if (value == null) {
            call.reject("Secret value is required.");
            return;
        }

        if (!isKeystoreSupported(call)) {
            return;
        }

        try {
            SecretKey secretKey = getOrCreateSecretKey();
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);

            byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV();

            boolean saved = getPreferences()
                    .edit()
                    .putString(ciphertextKey(key), Base64.encodeToString(ciphertext, Base64.NO_WRAP))
                    .putString(ivKey(key), Base64.encodeToString(iv, Base64.NO_WRAP))
                    .commit();

            JSObject response = new JSObject();
            response.put("saved", saved);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Unable to save secret.");
        }
    }

    @PluginMethod
    public void getSecret(PluginCall call) {
        String key = call.getString("key");

        if (!isValidKey(key)) {
            call.reject("Secret key is required.");
            return;
        }

        if (!isKeystoreSupported(call)) {
            return;
        }

        try {
            SharedPreferences preferences = getPreferences();
            String encodedCiphertext = preferences.getString(ciphertextKey(key), null);
            String encodedIv = preferences.getString(ivKey(key), null);
            JSObject response = new JSObject();

            if (encodedCiphertext == null || encodedIv == null) {
                response.put("exists", false);
                call.resolve(response);
                return;
            }

            SecretKey secretKey = getOrCreateSecretKey();
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            byte[] iv = Base64.decode(encodedIv, Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(encodedCiphertext, Base64.NO_WRAP);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            String value = new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            response.put("exists", true);
            response.put("value", value);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Unable to read secret.");
        }
    }

    @PluginMethod
    public void removeSecret(PluginCall call) {
        String key = call.getString("key");

        if (!isValidKey(key)) {
            call.reject("Secret key is required.");
            return;
        }

        boolean existed = getPreferences().contains(ciphertextKey(key)) || getPreferences().contains(ivKey(key));
        boolean saved = getPreferences()
                .edit()
                .remove(ciphertextKey(key))
                .remove(ivKey(key))
                .commit();

        JSObject response = new JSObject();
        response.put("removed", existed && saved);
        call.resolve(response);
    }

    @PluginMethod
    public void hasSecret(PluginCall call) {
        String key = call.getString("key");

        if (!isValidKey(key)) {
            call.reject("Secret key is required.");
            return;
        }

        SharedPreferences preferences = getPreferences();
        JSObject response = new JSObject();
        response.put("exists", preferences.contains(ciphertextKey(key)) && preferences.contains(ivKey(key)));
        call.resolve(response);
    }

    private boolean isKeystoreSupported(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return true;
        }

        call.reject("Secure secret storage is not available on this Android version.");
        return false;
    }

    private SecretKey getOrCreateSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        }

        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
        KeyGenParameterSpec keySpec = new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(false)
                .build();

        keyGenerator.init(keySpec);
        return keyGenerator.generateKey();
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private boolean isValidKey(String key) {
        return key != null && !key.trim().isEmpty();
    }

    private String ciphertextKey(String key) {
        return key + ":ciphertext";
    }

    private String ivKey(String key) {
        return key + ":iv";
    }
}
