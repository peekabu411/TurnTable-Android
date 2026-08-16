package com.luigimendoza.turntable;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "SpotifyAuth")
public class SpotifyAuthPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://accounts.spotify.com/")) {
            call.reject("A valid Spotify authorization URL is required.");
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
