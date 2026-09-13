package com.mt24horasexpress.cliente;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Registra os canais oficiais de notificação com som personalizado (notification_sound.mp3)
 * para a Central de Notificações do Android no App do Cliente.
 */
public final class NotificationChannels {

    public static final String CUSTOMER_CHANNEL_ID = "customer-order-updates-v1";

    private NotificationChannels() {}

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        try {
            nm.deleteNotificationChannel("default");
        } catch (Exception ignored) {}

        Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.notification_sound);
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

        if (nm.getNotificationChannel(CUSTOMER_CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(
                    CUSTOMER_CHANNEL_ID,
                    "Atualizações de Pedidos",
                    NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription("Avisos sonoros sobre o andamento e entrega do seu pedido");
            ch.setSound(soundUri, audioAttributes);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 600, 200, 600});
            ch.enableLights(true);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }
}
