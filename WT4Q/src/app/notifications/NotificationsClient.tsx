"use client";

import { useEffect, useState } from "react";
import { API_ROUTES } from "@/lib/api";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch(API_ROUTES.NOTIFICATIONS.GET, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Notification[]) => setNotifications(data))
      .catch(() => {});
  }, []);

  return (
    <main style={{ padding: "1rem" }}>
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id}>{n.message}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

