/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const appBaseUrl = new URL("./", self.location.href);
const notificationIconUrl = new URL("icons/icon-192.png", appBaseUrl).toString();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = new URL("./", appBaseUrl);

  if (event.action === "taken") {
    url.searchParams.set("action", "taken");
    url.searchParams.set("intake", data.intakeId);
  }

  if (event.action === "later") {
    const minutes = Number(data.repeatReminderMinutes || 10);
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(resolve, minutes * 60 * 1000);
      }).then(() =>
        self.registration.showNotification(event.notification.title, {
          body: event.notification.body,
          icon: notificationIconUrl,
          badge: notificationIconUrl,
          tag: `${data.intakeId}-later-${Date.now()}`,
          data,
          actions: [
            { action: "taken", title: "Принято" },
            { action: "later", title: `Через ${minutes} минут` }
          ]
        } as NotificationOptions & { actions?: Array<{ action: string; title: string }> })
      )
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => "focus" in item);
      if (client) {
        client.navigate(url.toString());
        return client.focus();
      }
      return self.clients.openWindow(url.toString());
    })
  );
});
