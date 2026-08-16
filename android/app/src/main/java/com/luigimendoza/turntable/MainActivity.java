package com.luigimendoza.turntable;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SpotifyAuthPlugin.class);
        super.onCreate(savedInstanceState);
        deliverSpotifyRedirect(getIntent());
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