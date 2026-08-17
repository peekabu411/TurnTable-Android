package com.luigimendoza.turntable;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AppLinkSettings")
public class AppLinkSettingsPlugin extends Plugin {
    private static final String VERIFIED_HOST = "peekabu411.github.io";

    @PluginMethod
    public void getVerificationStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("host", VERIFIED_HOST);
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
        result.put("enabled", false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                android.content.pm.verify.domain.DomainVerificationManager manager = getContext().getSystemService(android.content.pm.verify.domain.DomainVerificationManager.class);
                android.content.pm.verify.domain.DomainVerificationUserState state = manager == null ? null : manager.getDomainVerificationUserState(getContext().getPackageName());
                Integer hostState = state == null ? null : state.getHostToStateMap().get(VERIFIED_HOST);
                boolean enabled = hostState != null && (hostState == android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_VERIFIED || hostState == android.content.pm.verify.domain.DomainVerificationUserState.DOMAIN_STATE_SELECTED);
                result.put("enabled", enabled);
                result.put("state", hostState == null ? "none" : String.valueOf(hostState));
            } catch (Exception ignored) {
                result.put("supported", false);
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Android could not open Turntable's supported-links settings.", error);
        }
    }
}