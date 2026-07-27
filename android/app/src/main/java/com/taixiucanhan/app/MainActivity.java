package com.taixiucanhan.app;

import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private View privacyShieldView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometricPlugin.class);
        registerPlugin(DocumentSaverPlugin.class);
        registerPlugin(HapticFeedbackPlugin.class);
        registerPlugin(SecureSecretStorePlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(AppLockClockPlugin.class);
        registerPlugin(DeviceLockPlugin.class);
        registerPlugin(PrivacyShieldPlugin.class);
        registerPlugin(ScreenSecurityPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            setRecentsScreenshotEnabled(false);
        }
    }

    @Override
    public void onPause() {
        showPrivacyShield();
        super.onPause();
    }

    public void hidePrivacyShield() {
        if (privacyShieldView != null) {
            privacyShieldView.setVisibility(View.GONE);
        }
    }

    private void showPrivacyShield() {
        if (privacyShieldView == null) {
            privacyShieldView = createPrivacyShield();
            ((ViewGroup) getWindow().getDecorView()).addView(
                    privacyShieldView,
                    new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                    )
            );
            return;
        }

        privacyShieldView.setVisibility(View.VISIBLE);
        privacyShieldView.bringToFront();
    }

    private View createPrivacyShield() {
        FrameLayout shield = new FrameLayout(this);
        shield.setBackgroundColor(Color.rgb(245, 247, 250));
        shield.setClickable(true);
        shield.setFocusable(true);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        int iconSize = dp(80);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(iconSize, iconSize);
        icon.setLayoutParams(iconParams);

        TextView appName = new TextView(this);
        appName.setText(R.string.app_name);
        appName.setTextColor(Color.rgb(31, 41, 55));
        appName.setTextSize(17);
        appName.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        textParams.topMargin = dp(16);
        appName.setLayoutParams(textParams);

        GradientDrawable iconBackground = new GradientDrawable();
        iconBackground.setColor(Color.TRANSPARENT);
        iconBackground.setCornerRadius(dp(20));
        icon.setBackground(iconBackground);

        content.addView(icon);
        content.addView(appName);
        shield.addView(
                content,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
        return shield;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
