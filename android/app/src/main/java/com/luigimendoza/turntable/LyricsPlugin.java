package com.luigimendoza.turntable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Lyrics")
public class LyricsPlugin extends Plugin {
    private static final String LYRICS_API_PREFIX = "https://lrclib.net/api/";

    @PluginMethod
    public void request(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith(LYRICS_API_PREFIX)) {
            call.reject("Only the configured lyrics provider may be requested.");
            return;
        }
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10_000);
                connection.setReadTimeout(10_000);
                connection.setRequestProperty("Accept", "application/json");
                int status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                String body = readBody(stream);
                JSObject result = new JSObject();
                result.put("status", status);
                result.put("body", body);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Lyrics provider request failed.", error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }
}