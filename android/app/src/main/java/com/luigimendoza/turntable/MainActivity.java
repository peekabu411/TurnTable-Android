package com.luigimendoza.turntable;

import android.content.Intent;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SpotifyAuthPlugin.class);
        super.onCreate(savedInstanceState);
        enableImmersiveMode();
        deliverSpotifyRedirect(getIntent());
    }
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enableImmersiveMode();
    }

    private void enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        deliverSpotifyRedirect(intent);
    }

    private void deliverSpotifyRedirect(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        String url = intent.getData().toString();
        if (!url.startsWith("https://peekabu411.github.io/spotify/callback")) return;
        SpotifyAuthPlugin.savePendingRedirect(getApplicationContext(), url);
        if (getBridge() == null) return;
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('turntable:spotify-redirect',{detail:" + org.json.JSONObject.quote(url) + "}));", null));
    }
}