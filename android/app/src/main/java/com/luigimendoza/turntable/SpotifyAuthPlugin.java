package com.luigimendoza.turntable;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "SpotifyAuth")
public class SpotifyAuthPlugin extends Plugin {
    private static final String PREFERENCES = "turntable_spotify_auth";
    private static final String PENDING_REDIRECT = "pending_redirect";

    public static void savePendingRedirect(Context context, String url) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putString(PENDING_REDIRECT, url).apply();
    }

    @PluginMethod
    public void consumePendingRedirect(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        String url = preferences.getString(PENDING_REDIRECT, null);
        preferences.edit().remove(PENDING_REDIRECT).apply();
        JSObject result = new JSObject();
        if (url != null) result.put("url", url);
        call.resolve(result);
    }
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        Uri uri = url == null ? null : Uri.parse(url);
        String host = uri == null ? null : uri.getHost();
        boolean allowed = "accounts.spotify.com".equals(host) || "developer.spotify.com".equals(host) || "open.spotify.com".equals(host);
        if (uri == null || !"https".equals(uri.getScheme()) || !allowed) {
            call.reject("A valid Spotify URL is required.");
            return;
        }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            call.resolve();
        } catch (Exception error) {
            call.reject("No browser is available to open Spotify authorization.", error);
        }
    }
}
