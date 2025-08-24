"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { API_ROUTES } from "@/lib/api";
import { isLoggedIn, setLoggedIn } from "@/lib/auth";

function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const params = useSearchParams();

  useEffect(() => {
    if (isLoggedIn()) {
      fetch(API_ROUTES.USERS.ME, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((user) => {
          if (user && user.email) {
            setEmail(user.email);
            setConnected(true);
            setLoggedIn(true);
          } else {
            setLoggedIn(false);
          }
        })
        .catch(() => setLoggedIn(false));
    }
    if (params.get("type") === "problem") {
      setMessage("I would like to report a problem: ");
    }
  }, [params]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = connected ? { message } : { email, message };
    try {
      const res = await fetch(API_ROUTES.CONTACT.POST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (res.ok) {
        setStatus("Message sent");
        setMessage("");
      } else {
        setStatus("Failed to send message");
      }
    } catch {
      setStatus("Failed to send message");
    }
  };

  return (
    <main style={{ padding: "1rem" }}>
      <h1>Contact Us</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "400px" }}
      >
        {!connected && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Your email"
          />
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="Your message"
        />
        <button type="submit">Send</button>
        {status && <p>{status}</p>}
      </form>
    </main>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactForm />
    </Suspense>
  );
}
