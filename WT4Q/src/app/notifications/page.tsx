"use client";

import { useEffect, useState } from "react";
import { API_ROUTES } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return;
    fetch(API_ROUTES.NOTIFICATIONS.GET, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Notification[]) => setNotifications(data))
      .catch(() => {});
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <main style={{ padding: "1rem" }}>
        <h1>Notifications</h1>
        <p>Please log in to view notifications.</p>
      </main>
    );
  }

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

