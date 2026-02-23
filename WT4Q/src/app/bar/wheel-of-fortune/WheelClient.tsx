"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { API_ROUTES } from "@/lib/api";
import { slugify } from "@/lib/text";
import { publicMediaUrl } from "@/lib/media";
import { resolveCocktailImage } from "@/lib/cocktailImage";
import styles from "../bar.module.css";

interface Cocktail {
  id: number;
  name: string;
  content: string;
  description?: string | null;
  method?: string | null;
  glassType?: string | null;
  imageUrl?: string | null;
  glassImageUrl?: string | null;
  stableImageUrl?: string | null;
  stableGlassImageUrl?: string | null;
  imageAltText?: string | null;
  imageCaption?: string | null;
  glassImageAltText?: string | null;
  glassImageCaption?: string | null;
  facts?: string[] | null;
  ingridients?: { id: number; name: string }[] | null;
  ingredientQuantities?: {
    id: number;
    quantity: string;
    ingridient?: { id: number; name: string } | null;
  }[] | null;
}

type WheelEntryKind = "cocktail" | "custom";

interface WheelEntry {
  id: number;
  label: string;
  color: string;
  kind: WheelEntryKind;
  cocktail?: Cocktail;
}

interface SpinParams {
  startRotation: number;
  targetRotation: number;
  startTime: number | null;
  durationMs: number;
}

const MAX_ENTRIES = 15;
const WHEEL_STORAGE_KEY = 'bar.wheelLists.v1';

interface WheelListEntry {
  kind: WheelEntryKind;
  label: string;
  cocktailId?: number;
}

interface WheelList {
  id: string;
  name: string;
  entries: WheelListEntry[];
  createdAt: string;
}

const createColorForIndex = (index: number): string => {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue.toFixed(1)}, 75%, 55%)`;
};

const wheelPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "16px",
  borderRadius: "20px",
  background: "rgba(255, 255, 255, 0.95)",
  border: "2px solid rgba(18, 11, 31, 0.2)",
  boxShadow: "10px 10px 0 rgba(18, 11, 31, 0.12)",
  color: "#120b1f",
};

const visualStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const wheelOuterStyle: CSSProperties = {
  position: "relative",
  // Keep the wheel fully inside the panel and centered,
  // even on narrow mobile screens with page padding.
  width: "min(460px, 100%)",
  maxWidth: "100%",
  margin: "0 auto",
};

const canvasStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
};

const resultBannerStyle: CSSProperties = {
  marginTop: "12px",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(255, 212, 59, 0.22)",
  border: "1px solid rgba(18, 11, 31, 0.35)",
  fontSize: "0.95rem",
  textAlign: "center",
};

const resultLabelStyle: CSSProperties = {
  fontWeight: 600,
};

const spinButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 22px",
  borderRadius: "999px",
  border: "2px solid #120b1f",
  background: "#ff3d9a",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.95rem",
  boxShadow: "4px 4px 0 rgba(18, 11, 31, 0.18)",
};

const errorStyle: CSSProperties = {
  marginTop: "10px",
  padding: "8px 12px",
  borderRadius: "12px",
  background: "rgba(217, 43, 74, 0.1)",
  border: "1px solid rgba(217, 43, 74, 0.5)",
  color: "#8b2035",
  fontSize: "0.85rem",
};

const addOptionStyle: CSSProperties = {
  marginTop: "1rem",
};

const addOptionLabelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  marginBottom: "4px",
  color: "#120b1f",
};

const addOptionRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
};

const addOptionInputStyle: CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: "999px",
  border: "2px solid rgba(18, 11, 31, 0.2)",
  background: "#ffffff",
  color: "#120b1f",
  fontSize: "0.9rem",
  outline: "none",
};

const addOptionButtonStyle: CSSProperties = {
  padding: "7px 14px",
  borderRadius: "999px",
  border: "2px solid #120b1f",
  background: "#ff3d9a",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

const addOptionTipStyle: CSSProperties = {
  marginTop: "4px",
  fontSize: "0.75rem",
  color: "#4a3f63",
};

const entriesHeaderStyle: CSSProperties = {
  marginTop: "1.5rem",
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#120b1f",
};

const entryRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "6px 4px",
};

const entryColorDotStyle: CSSProperties = {
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  border: "1px solid rgba(18, 11, 31, 0.2)",
};

const entryLabelStyle: CSSProperties = {
  flex: 1,
  fontSize: "0.85rem",
  color: "#120b1f",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const entryRemoveButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#b42343",
  cursor: "pointer",
  fontSize: "0.9rem",
};

export default function WheelClient() {
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [entries, setEntries] = useState<WheelEntry[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [wheelError, setWheelError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultEntry, setResultEntry] = useState<WheelEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listName, setListName] = useState('');
  const [savedLists, setSavedLists] = useState<WheelList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const entryIdCounter = useRef(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const spinParamsRef = useRef<SpinParams | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const entriesRef = useRef<WheelEntry[]>(entries);
  const resultRef = useRef<WheelEntry | null>(resultEntry);
  const resultDetailsRef = useRef<HTMLDivElement | null>(null);
  const sharedListAppliedRef = useRef(false);

  const brandAlt = (text: string | undefined | null, fallback: string) =>
    `${(text && text.trim().length ? text.trim() : fallback) || fallback} by The Nineties Times (www.90stimes.com)`;

  const createCocktailEntry = useCallback(
    (cocktail: Cocktail): WheelEntry => {
      const id = entryIdCounter.current++;
      return {
        id,
        label: cocktail.name,
        color: createColorForIndex(id),
        kind: "cocktail",
        cocktail,
      };
    },
    []
  );

  const createCustomEntry = useCallback((label: string): WheelEntry => {
    const id = entryIdCounter.current++;
    return {
      id,
      label,
      color: createColorForIndex(id),
      kind: "custom",
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(WHEEL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedLists(parsed);
      }
    } catch {
      // ignore malformed saved lists
    }
  }, []);

  useEffect(() => {
    resultRef.current = resultEntry;
    if (resultEntry && resultDetailsRef.current) {
      resultDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [resultEntry]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const opts = entriesRef.current;
    const winner = resultRef.current;
    const total = opts.length;
    if (!width || !height) return;

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const radius = Math.min(width, height) * 0.5 * 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#020617";
    ctx.fill();

    if (total > 0) {
      const segmentAngleRad = (2 * Math.PI) / total;
      const rotationRad = (rotationRef.current * Math.PI) / 180;

      for (let i = 0; i < total; i++) {
        const option = opts[i];
        const startAngle = -Math.PI / 2 + rotationRad + i * segmentAngleRad;
        const endAngle = startAngle + segmentAngleRad;
        const midAngle = (startAngle + endAngle) / 2;
        const isWinner = winner && winner.id === option.id;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle, false);
        ctx.closePath();
        ctx.fillStyle = option.color;
        ctx.fill();

        if (isWinner) {
          ctx.save();
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = radius * 0.04;
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = radius * 0.01;
        ctx.stroke();
        ctx.restore();

        const labelRadius = radius * 0.65;
        const x = Math.cos(midAngle) * labelRadius;
        const y = Math.sin(midAngle) * labelRadius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(midAngle);
        ctx.fillStyle = "#f9fafb";
        ctx.font = `${Math.max(radius * 0.09, 12)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(option.label, 0, 0, radius * 0.9);
        ctx.restore();
      }
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.lineWidth = radius * 0.03;
    ctx.strokeStyle = "#f8fafc";
    ctx.fill();
    ctx.stroke();

    const pointerHeight = radius * 0.25;
    const pointerWidth = radius * 0.22;
    ctx.save();
    ctx.translate(0, -radius * 1.02);
    ctx.beginPath();
    ctx.moveTo(-pointerWidth / 2, 0);
    ctx.lineTo(pointerWidth / 2, 0);
    ctx.lineTo(0, pointerHeight);
    ctx.closePath();
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = radius * 0.03;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = radius * 0.07;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, []);

  useEffect(() => {
    entriesRef.current = entries;
    drawWheel();
  }, [entries, drawWheel]);

  useEffect(() => {
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const size = rect.width;
      if (!size) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      drawWheel();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [drawWheel]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const finalizeSpin = useCallback(() => {
    const opts = entriesRef.current;
    if (!opts.length) {
      setIsSpinning(false);
      return;
    }
    const total = opts.length;
    const segmentAngle = 360 / total;
    let normalized = rotationRef.current % 360;
    if (normalized < 0) normalized += 360;
    const angleAtPointer = (360 - normalized + 0.0001) % 360;
    let index = Math.floor(angleAtPointer / segmentAngle);
    if (index < 0) index = 0;
    if (index >= total) index = total - 1;

    const winner = opts[index];
    setResultEntry(winner);
    resultRef.current = winner;
    setIsSpinning(false);
    drawWheel();
  }, [drawWheel]);

  const animate = useCallback(
    (timestamp: number) => {
      const params = spinParamsRef.current;
      if (!params) return;
      if (params.startTime === null) {
        params.startTime = timestamp;
      }
      const elapsed = timestamp - params.startTime;
      const tRaw = elapsed / params.durationMs;
      const t = Math.min(1, Math.max(0, tRaw));
      const eased = 1 - Math.pow(1 - t, 3);

      rotationRef.current =
        params.startRotation +
        (params.targetRotation - params.startRotation) * eased;
      drawWheel();

      if (t < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        spinParamsRef.current = null;
        animationFrameRef.current = null;
        finalizeSpin();
      }
    },
    [drawWheel, finalizeSpin]
  );

  const refreshCocktails = useCallback(
    async (options?: { autoSeed?: boolean }) => {
      setLoading(true);
      setRefreshing(true);
      setFetchError(null);
      try {
        const res = await fetch(API_ROUTES.COCKTAIL.GET_ALL, { cache: "no-store" });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || "Unable to load cocktails.");
        }
        const data = (await res.json()) as Cocktail[] | null;
        const list = Array.isArray(data) ? data : [];
        setAllCocktails(list);
        if (options?.autoSeed && list.length && entriesRef.current.length === 0) {
          const initialCount = Math.min(Math.min(4, list.length), MAX_ENTRIES);
          const initialEntries = list
            .slice(0, initialCount)
            .map((cocktail) => createCocktailEntry(cocktail));
          setEntries(initialEntries);
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Unable to load cocktails.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [createCocktailEntry]
  );

  useEffect(() => {
    void refreshCocktails({ autoSeed: true });
  }, [refreshCocktails]);

  const encodeListForUrl = useCallback((list: WheelList): string => {
    if (typeof window === 'undefined') return '';
    const json = JSON.stringify(list);
    const base64 = window.btoa(
      encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(Number.parseInt(p1, 16)),
      ),
    );
    return encodeURIComponent(base64);
  }, []);

  const decodeListFromUrl = useCallback((value: string): WheelList | null => {
    if (typeof window === 'undefined') return null;
    try {
      const base64 = decodeURIComponent(value);
      const json = decodeURIComponent(
        Array.prototype.map
          .call(window.atob(base64), (c: string) =>
            `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`,
          )
          .join(''),
      );
      const parsed = JSON.parse(json) as WheelList;
      if (!parsed || !Array.isArray(parsed.entries)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCocktails();
      }
    };
    const interval = window.setInterval(() => void refreshCocktails(), 30000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCocktails]);

  const ingredientNames = (cocktail: Cocktail): string[] => {
    const names = [
      ...(cocktail.ingredientQuantities?.map((iq) => iq.ingridient?.name || "") ?? []),
      ...(cocktail.ingridients?.map((ing) => ing.name || "") ?? []),
    ]
      .map((n) => n.trim())
      .filter(Boolean);
    return Array.from(new Set(names.map((n) => n.toLowerCase()))).map(
      (n) => n.charAt(0).toUpperCase() + n.slice(1)
    );
  };

  const rebuildEntriesFromList = useCallback(
    (list: WheelList): WheelEntry[] => {
      const built: WheelEntry[] = [];
      for (const entry of list.entries) {
        if (entry.kind === 'cocktail' && entry.cocktailId) {
          const cocktail = allCocktails.find((c) => c.id === entry.cocktailId);
          if (cocktail) {
            built.push(createCocktailEntry(cocktail));
            continue;
          }
        }
        if (entry.label && entry.label.trim().length > 0) {
          built.push(createCustomEntry(entry.label));
        }
      }
      return built;
    },
    [allCocktails, createCocktailEntry, createCustomEntry],
  );

  useEffect(() => {
    if (sharedListAppliedRef.current) return;
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('wheelList');
      if (!raw) return;
      const imported = decodeListFromUrl(raw);
      if (!imported) return;
      const builtEntries = rebuildEntriesFromList(imported);
      if (!builtEntries.length) return;

      sharedListAppliedRef.current = true;
      setEntries(builtEntries);
      setListName(imported.name || '');
      setWheelError(null);
      setResultEntry(null);
      resultRef.current = null;
    } catch {
      // ignore invalid share params
    }
  }, [decodeListFromUrl, rebuildEntriesFromList]);

  const availableCocktails = useMemo(() => {
    const takenIds = new Set(
      entries.filter((entry) => entry.kind === "cocktail" && entry.cocktail).map((entry) => entry.cocktail!.id)
    );
    const lower = query.trim().toLowerCase();
    const canFilter = lower.length >= 2;
    const filtered = allCocktails.filter((cocktail) => {
      if (takenIds.has(cocktail.id)) return false;
      if (!canFilter) return true;
      const haystack = `${cocktail.name} ${cocktail.content}`.toLowerCase();
      return haystack.includes(lower);
    });
    const sorted = filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    if (!canFilter) {
      return sorted.slice(0, 10);
    }
    return sorted;
  }, [allCocktails, entries, query]);

  const handleAddCocktail = (cocktail: Cocktail) => {
    if (isSpinning) return;
    if (entries.length >= MAX_ENTRIES) {
      setWheelError(`Only ${MAX_ENTRIES} entries allowed on the wheel.`);
      return;
    }
    if (entries.some((entry) => entry.kind === "cocktail" && entry.cocktail?.id === cocktail.id)) {
      setWheelError("That cocktail is already on the wheel.");
      return;
    }
    setEntries((prev) => [...prev, createCocktailEntry(cocktail)]);
    setWheelError(null);
  };

  const handleAddManualEntry = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) {
      setWheelError("Custom entry cannot be empty.");
      return;
    }
    if (entries.length >= MAX_ENTRIES) {
      setWheelError(`Only ${MAX_ENTRIES} entries allowed on the wheel.`);
      return;
    }
    setEntries((prev) => [...prev, createCustomEntry(trimmed)]);
    setManualInput("");
    setWheelError(null);
  };

  const handleRemoveEntry = (id: number) => {
    if (isSpinning) return;
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setResultEntry((prev) => (prev && prev.id === id ? null : prev));
  };

  const handleSpin = useCallback(() => {
    if (isSpinning) return;
    if (entriesRef.current.length < 2) {
      setWheelError("Add at least two entries before spinning.");
      return;
    }
    setWheelError(null);
    setResultEntry(null);
    resultRef.current = null;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const minTurns = 4;
    const maxTurns = 7;
    const turns = Math.floor(Math.random() * (maxTurns - minTurns + 1)) + minTurns;
    const extraDegrees = Math.random() * 360;
    const startRotation = rotationRef.current;
    const targetRotation = startRotation + turns * 360 + extraDegrees;

    spinParamsRef.current = {
      startRotation,
      targetRotation,
      startTime: null,
      durationMs: 4200,
    };

    setIsSpinning(true);
    animationFrameRef.current = window.requestAnimationFrame(animate);
  }, [animate, isSpinning]);

  const handleSaveCurrentAsList = () => {
    if (!entriesRef.current.length) {
      setListMessage('Add entries to the wheel before saving a list.');
      return;
    }
    const name =
      listName.trim().length > 0
        ? listName.trim()
        : `My cocktail wheel (${new Date().toLocaleDateString()})`;

    const payload: WheelListEntry[] = entriesRef.current.map((entry) => ({
      kind: entry.kind,
      label: entry.label,
      cocktailId:
        entry.kind === 'cocktail' && entry.cocktail ? entry.cocktail.id : undefined,
    }));

    let newId: string | null = null;
    setSavedLists((prev) => {
      const existingIndex = activeListId
        ? prev.findIndex((l) => l.id === activeListId)
        : -1;
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          name,
          entries: payload,
          createdAt: new Date().toISOString(),
        };
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(next));
          }
        } catch {
          // ignore
        }
        setListMessage('List updated on this device.');
        return next;
      }

      const id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? (crypto as Crypto).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`) || `${Date.now()}`;
      newId = id;
      const next: WheelList[] = [
        ...prev,
        {
          id,
          name,
          entries: payload,
          createdAt: new Date().toISOString(),
        },
      ];
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      setListMessage('List saved on this device.');
      return next;
    });

    if (newId) {
      setActiveListId(newId);
    }
  };

  const handleLoadList = (list: WheelList) => {
    const built = rebuildEntriesFromList(list);
    if (!built.length) {
      setListMessage('This list has no usable entries. It may refer to removed cocktails.');
      return;
    }
    setEntries(built);
    setListName(list.name);
    setActiveListId(list.id);
    setWheelError(null);
    setResultEntry(null);
    resultRef.current = null;
    setListMessage('List loaded into the wheel.');
  };

  const handleDeleteList = (id: string) => {
    setSavedLists((prev) => {
      const next = prev.filter((l) => l.id !== id);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
    if (activeListId === id) {
      setActiveListId(null);
    }
  };

  const handleShareList = async (list: WheelList) => {
    if (typeof window === 'undefined') return;
    try {
      const encoded = encodeListForUrl(list);
      if (!encoded) return;
      let shareUrl: string;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('wheelList', encoded);
        shareUrl = url.toString();
      } catch {
        shareUrl = `${window.location.origin}/bar/wheel-of-fortune?wheelList=${encoded}`;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            url: shareUrl,
            title: `Cocktail wheel: ${list.name}`,
            text: 'Spin this cocktail wheel with me.',
          });
          setListMessage('Opened share sheet.');
          return;
        } catch {
          // fall through to clipboard
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setListMessage('Shareable link copied to clipboard.');
      } else {
        setListMessage('Unable to access clipboard; copy the URL from the address bar.');
      }
    } catch {
      setListMessage('Unable to create a shareable link for this list.');
    }
  };

  const handleResetList = () => {
    setEntries([]);
    setResultEntry(null);
    resultRef.current = null;
    setWheelError(null);
    setListMessage('Wheel cleared. Start adding new entries.');
  };

  const renderResultDetails = () => {
    if (!resultEntry) return null;
    const playAgainButton = (
      <button
        type="button"
        className={styles.playAgainButton}
        onClick={handleSpin}
        disabled={isSpinning || entriesRef.current.length < 2}
      >
        {isSpinning ? "Spinning..." : "Play again"}
      </button>
    );
    if (resultEntry.kind === "cocktail" && resultEntry.cocktail) {
      const cocktail = resultEntry.cocktail;
      const facts = Array.isArray(cocktail.facts)
        ? cocktail.facts.filter((fact) => fact && fact.trim().length > 0)
        : [];
      const ingredients =
        cocktail.ingredientQuantities && cocktail.ingredientQuantities.length
          ? cocktail.ingredientQuantities
          : [];
      const mainImage =
        publicMediaUrl(cocktail.stableImageUrl || cocktail.imageUrl || undefined) ||
        resolveCocktailImage({ name: cocktail.name });
      const glassImage = publicMediaUrl(
        cocktail.stableGlassImageUrl || cocktail.glassImageUrl || undefined
      );
      return (
        <article ref={resultDetailsRef} className={styles.wheelResultCard} id="wheel-result">
          <div className={styles.wheelResultHeaderRow}>
            <div>
              <p className={styles.wheelResultLabel}>Tonight&apos;s pick</p>
              <h3 className={styles.wheelResultName}>{cocktail.name}</h3>
              {cocktail.description && (
                <p className={styles.wheelResultSummary}>{cocktail.description}</p>
              )}
              {(cocktail.method || cocktail.glassType) && (
                <p className={styles.wheelResultMeta}>
                  {cocktail.method ? `Method: ${cocktail.method.toUpperCase()}` : ""}
                  {cocktail.method && cocktail.glassType ? " / " : ""}
                  {cocktail.glassType ? `Glass: ${cocktail.glassType.toUpperCase()}` : ""}
                </p>
              )}
              <Link
                href={`/bar/cocktails/${cocktail.id}-${slugify(cocktail.name || "")}`}
                className={styles.wheelResultLink}
              >
                Open full recipe
              </Link>
            </div>
          </div>

          {(mainImage || glassImage) && (
            <div className={styles.wheelResultImages}>
              {mainImage && (
                <figure className={styles.wheelResultFigure}>
                  <img
                    src={mainImage}
                    alt={brandAlt(cocktail.imageAltText, cocktail.name)}
                    className={styles.wheelResultImg}
                    loading="lazy"
                  />
                  {cocktail.imageCaption && (
                    <figcaption className={styles.wheelResultCaption}>{cocktail.imageCaption}</figcaption>
                  )}
                </figure>
              )}
              {glassImage && (
                <figure className={styles.wheelResultFigure}>
                  <img
                    src={glassImage}
                    alt={brandAlt(cocktail.glassImageAltText, cocktail.glassType || "Glass")}
                    className={styles.wheelResultImg}
                    loading="lazy"
                  />
                  {cocktail.glassImageCaption && (
                    <figcaption className={styles.wheelResultCaption}>{cocktail.glassImageCaption}</figcaption>
                  )}
                </figure>
              )}
            </div>
          )}

          {cocktail.content && <p className={styles.wheelResultText}>{cocktail.content}</p>}

          {(ingredients.length > 0 || facts.length > 0) && (
            <div className={styles.wheelResultBody}>
              {ingredients.length > 0 && (
                <div>
                  <h4 className={styles.wheelResultTitle}>Ingredients</h4>
                  <ul className={styles.wheelResultList}>
                    {ingredients.map((iq) => (
                      <li key={iq.id}>
                        <span>{iq.quantity}</span> <strong>{iq.ingridient?.name ?? ""}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {facts.length > 0 && (
                <div>
                  <h4 className={styles.wheelResultTitle}>Notes</h4>
                  <div className={styles.wheelResultPills}>
                    {facts.map((fact, idx) => (
                      <span key={idx} className={styles.wheelResultPill}>
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.wheelResultActions}>{playAgainButton}</div>
        </article>
      );
    }

    return (
      <div ref={resultDetailsRef} className={styles.wheelResultCard} id="wheel-result">
        <p className={styles.wheelResultLabel}>Winner</p>
        <p className={styles.wheelResultName}>{resultEntry.label}</p>
        <div className={styles.wheelResultActions}>{playAgainButton}</div>
      </div>
    );
  };

  return (
    <div className={styles.wheelPage}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>Wheel of Cocktails</h1>
          <p className={styles.subtitle}>
            Mix custom entries with your uploaded cocktails, then let the wheel pick the next round.
          </p>
        </div>
      </section>

      <section className={styles.wheelLayout}>
        <aside className={styles.wheelSidebar}>
          <div style={wheelPanelStyle}>
            <div style={visualStyle}>
              <div ref={containerRef} style={wheelOuterStyle}>
                <canvas ref={canvasRef} style={canvasStyle} />
              </div>
              {resultEntry && (
                <div style={resultBannerStyle}>
                  Winner: <span style={resultLabelStyle}>{resultEntry.label}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              style={spinButtonStyle}
              onClick={handleSpin}
              disabled={isSpinning || entries.length < 2}
            >
              {isSpinning ? "Rolling..." : "Roll your cocktail"}
            </button>
            {wheelError && <div style={errorStyle}>{wheelError}</div>}
            {renderResultDetails()}
          </div>
        </aside>

        <div className={styles.wheelConfig}>
          <div style={addOptionStyle}>
            <label htmlFor="custom-entry" style={addOptionLabelStyle}>
              Add a custom entry
            </label>
            <div style={addOptionRowStyle}>
              <input
                id="custom-entry"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                disabled={isSpinning || entries.length >= MAX_ENTRIES}
                placeholder="Type a custom entry..."
                maxLength={40}
                style={addOptionInputStyle}
              />
              <button
                type="button"
                onClick={handleAddManualEntry}
                disabled={isSpinning || entries.length >= MAX_ENTRIES}
                style={addOptionButtonStyle}
              >
                Add
              </button>
            </div>
            <div style={addOptionTipStyle}>
              Short names look sharper on the wheel. Max {MAX_ENTRIES} entries.
            </div>
          </div>

          <div style={entriesHeaderStyle}>Current wheel entries ({entries.length})</div>
          <div className={styles.selectedList}>
            <label htmlFor="wheel-list-name" style={addOptionLabelStyle}>
              List name (optional)
            </label>
            <input
              id="wheel-list-name"
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Friday Night, Guests, Classics"
              style={addOptionInputStyle}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={addOptionButtonStyle}
                onClick={handleSaveCurrentAsList}
                disabled={isSpinning || !entries.length}
              >
                Save list
              </button>
              <button
                type="button"
                className={styles.clearWheelButton}
                onClick={handleResetList}
                disabled={isSpinning || !entries.length}
              >
                Clear wheel
              </button>
            </div>
            {savedLists.length > 0 && (
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#4a3f63' }}>Saved lists on this device</span>
                {savedLists.map((list) => (
                  <div key={list.id} className={styles.selectedItem}>
                    <span>{list.name}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.availableAddButton}
                        onClick={() => handleLoadList(list)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className={styles.gameButtonSecondary}
                        onClick={() => void handleShareList(list)}
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        className={styles.selectedRemoveButton}
                        onClick={() => handleDeleteList(list.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {listMessage && (
              <p style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#4a3f63' }}>
                {listMessage}
              </p>
            )}
          </div>
          <div className={styles.availableListWrapper}>
            {entries.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#4a3f63" }}>
                Nothing on the wheel yet. Add cocktails or custom entries.
              </p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} style={entryRowStyle}>
                  <span
                    style={{
                      ...entryColorDotStyle,
                      backgroundColor: entry.color,
                    }}
                  />
                  <span style={entryLabelStyle}>
                    {entry.label} {entry.kind === "cocktail" ? "(cocktail)" : ""}
                  </span>
                  <button
                    type="button"
                    style={entryRemoveButtonStyle}
                    aria-label={`Remove ${entry.label}`}
                    onClick={() => handleRemoveEntry(entry.id)}
                    disabled={isSpinning}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <header className={styles.sectionHeader} style={{ marginTop: "1.25rem" }}>
            <h2 className={styles.sectionTitle}>Add cocktails to the wheel</h2>
            <p className={styles.sectionHint}>
              Search your recipes and tap to add them. You can combine cocktails and custom entries.
            </p>
          </header>
          <div className={styles.availableToolbar}>
            <button
              type="button"
              className={styles.availableRefresh}
              onClick={() => void refreshCocktails()}
              disabled={loading || refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh cocktails"}
            </button>
            <span className={styles.availableCount}>
              {allCocktails.length} uploaded
            </span>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className={styles.form}
            style={{ marginBottom: "0.75rem" }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.input}
              placeholder="Search cocktails to add to the wheel (min 2 letters)..."
              aria-label="Search cocktails for wheel"
            />
          </form>
          {fetchError && <p className={styles.error}>{fetchError}</p>}
          {loading ? (
            <p className={styles.emptyState}>Loading cocktails...</p>
          ) : availableCocktails.length === 0 ? (
            <p className={styles.emptyState}>
              No more cocktails match this search. Try changing the term or remove some from the wheel.
            </p>
          ) : (
            <div className={styles.availableListWrapper}>
              <ul className={styles.availableList}>
                {availableCocktails.map((cocktail) => {
                  const img = resolveCocktailImage(cocktail);
                  const ing = ingredientNames(cocktail).slice(0, 4);
                  return (
                    <li key={cocktail.id} className={styles.availableCard}>
                      {img && (
                        <img
                          src={img}
                          alt={brandAlt(cocktail.imageAltText, cocktail.name)}
                          className={styles.availableThumb}
                          loading="lazy"
                        />
                      )}
                      <div className={styles.availableBody}>
                        <h3 className={styles.availableTitle}>{cocktail.name}</h3>
                        {ing.length > 0 ? (
                          <div className={styles.cocktailMetaRow}>
                            {ing.map((tag) => (
                              <span key={tag} className={styles.sharedChip}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.availableExcerpt}>
                            {cocktail.content && cocktail.content.length > 90
                              ? `${cocktail.content.slice(0, 90)}...`
                              : cocktail.content}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.availableAddButton}
                        onClick={() => handleAddCocktail(cocktail)}
                        disabled={isSpinning || entries.length >= MAX_ENTRIES}
                      >
                        Add
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

