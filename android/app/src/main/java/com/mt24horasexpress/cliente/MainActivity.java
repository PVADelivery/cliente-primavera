package com.mt24horasexpress.cliente;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            NotificationChannels.ensureChannels(this);
        } catch (Exception ignored) {}
    }
}
