'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import type { Show, ShowKind, ShowTrivia } from '@/lib/shows.types';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import styles from '@/app/born-in-the-90s/retro.module.css';
import { VAULT_BASE } from '@/lib/vaultPaths';

const SHOW_KINDS: ShowKind[] = ['TV', 'Film', 'Music', 'Game', 'Other'];

type ShowListResponse = {
  items?: Show[];
};

type ShowDetail = Show & {
  trivias?: ShowTrivia[];
};

type ShowForm = {
  title: string;
  kind: ShowKind;
  description: string;
  imageUrl: string;
  imageAltText: string;
  imageCaption: string;
  yearStart: string;
  yearEnd: string;
  tagsText: string;
};

const EMPTY_FORM: ShowForm = {
  title: '',
  kind: 'TV',
  description: '',
  imageUrl: '',
  imageAltText: '',
  imageCaption: '',
  yearStart: '',
  yearEnd: '',
  tagsText: '',
};

export default function ShowAdminClient() {
  const admin = useAdminGuard();

  const [items, setItems] = useState<Show[]>([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ShowKind | ''>('');

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingShow, setEditingShow] = useState<ShowDetail | null>(null);
  const [form, setForm] = useState<ShowForm>(EMPTY_FORM);

  const [newTrivia, setNewTrivia] = useState('');
  const [newTriviaImageUrl, setNewTriviaImageUrl] = useState('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    void (async () => {
      try {
        const res = await apiFetch(API_ROUTES.SHOW.LIST('', '', 1, 100));
        if (!res.ok) return;
        const payload = (await res.json()) as ShowListResponse;
        setItems(payload.items ?? []);
      } catch {
        // no-op: initial load best effort
      }
    })();
  }, [admin]);

  async function loadShows() {
    setError(null);
    try {
      const res = await apiFetch(API_ROUTES.SHOW.LIST(query, kindFilter || '', 1, 100));
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      const payload = (await res.json()) as ShowListResponse;
      setItems(payload.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load shows');
    }
  }

  async function startEdit(slug: string) {
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(API_ROUTES.SHOW.GET(slug));
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      const show = (await res.json()) as ShowDetail;
      setEditingSlug(show.slug);
      setEditingShow(show);
      setForm({
        title: show.title ?? '',
        kind: normalizeKind(show.kind),
        description: show.description ?? '',
        imageUrl: show.imageUrl ?? '',
        imageAltText: show.imageAltText ?? '',
        imageCaption: show.imageCaption ?? '',
        yearStart: show.yearStart ? String(show.yearStart) : '',
        yearEnd: show.yearEnd ? String(show.yearEnd) : '',
        tagsText: (show.tags ?? []).join(', '),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load show');
    }
  }

  async function saveShow() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!form.title.trim()) throw new Error('Title is required');

      const payload = {
        title: form.title.trim(),
        kind: form.kind,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        imageAltText: form.imageAltText.trim() || undefined,
        imageCaption: form.imageCaption.trim() || undefined,
        yearStart: parseOptionalInt(form.yearStart),
        yearEnd: parseOptionalInt(form.yearEnd),
        tags: parseCsv(form.tagsText),
      };

      const res = await apiFetch(
        editingSlug ? API_ROUTES.SHOW.UPDATE(editingSlug) : API_ROUTES.SHOW.CREATE,
        {
          method: editingSlug ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        throw new Error(await safeText(res));
      }

      const data = (await res.json()) as { slug?: string };
      const savedSlug = data.slug || editingSlug;
      if (!savedSlug) {
        throw new Error('Server did not return show slug');
      }

      setEditingSlug(savedSlug);
      await startEdit(savedSlug);
      await loadShows();
      setMessage('Show saved');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save show');
    } finally {
      setBusy(false);
    }
  }

  async function deleteShow(slug: string) {
    if (!confirm(`Delete show '${slug}'?`)) return;
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(API_ROUTES.SHOW.DELETE(slug), { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      if (editingSlug === slug) {
        clearForm();
      }
      await loadShows();
      setMessage('Show deleted');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete show');
    }
  }

  async function addTrivia() {
    if (!editingSlug) {
      setError('Save the show first, then add trivia');
      return;
    }
    if (!newTrivia.trim()) {
      setError('Trivia text is required');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const payload = {
        text: newTrivia.trim(),
        imageUrl: newTriviaImageUrl.trim() || undefined,
      };
      const res = await apiFetch(API_ROUTES.SHOW.ADD_TRIVIA(editingSlug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      setNewTrivia('');
      setNewTriviaImageUrl('');
      await startEdit(editingSlug);
      setMessage('Trivia added');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add trivia');
    }
  }

  async function removeTrivia(triviaId: string) {
    if (!editingSlug) return;
    if (!confirm('Delete this trivia?')) return;
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(API_ROUTES.SHOW.DELETE_TRIVIA(editingSlug, triviaId), {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      await startEdit(editingSlug);
      setMessage('Trivia removed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove trivia');
    }
  }

  function clearForm() {
    setEditingSlug(null);
    setEditingShow(null);
    setForm(EMPTY_FORM);
    setNewTrivia('');
    setNewTriviaImageUrl('');
  }

  if (!admin) return null;

  return (
    <div style={{ maxWidth: 1100, margin: '1rem auto', display: 'grid', gap: '1rem' }}>
      <section className={styles.hero}>
        <h1 className={styles.mast}>90s Shows Admin</h1>
        <p className={styles.tag}>Manage shows, films, music, and game entries linked to 90s Exclusive quizzes.</p>
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        <PrefetchLink href="/admin/dashboard" className={styles.adminLink}>Dashboard</PrefetchLink>
        <PrefetchLink href="/admin/quizzes" className={styles.adminLink}>Manage Quizzes</PrefetchLink>
        <PrefetchLink href={VAULT_BASE} className={styles.adminLink}>90s Exclusive</PrefetchLink>
      </section>

      {error && <div style={{ color: '#8a0000', fontWeight: 700 }}>{error}</div>}
      {message && <div style={{ color: '#114900', fontWeight: 700 }}>{message}</div>}

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>Search Catalog</h2>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title..."
            style={{ ...inputStyle, flex: 1, minWidth: 260 }}
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter((e.target.value || '') as ShowKind | '')}
            style={inputStyle}
          >
            <option value="">All</option>
            {SHOW_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <button type="button" className={styles.cta} onClick={loadShows}>
            Search
          </button>
        </div>
      </section>

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>{editingSlug ? `Edit Show: ${editingSlug}` : 'Create Show'}</h2>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className={styles.cta} onClick={saveShow} disabled={busy}>
            {busy ? 'Saving...' : 'Save Show'}
          </button>
          <button type="button" className={styles.cta} onClick={clearForm}>
            New Show
          </button>
        </div>
        <input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Title"
          style={inputStyle}
        />
        <div style={gridStyle}>
          <label>
            Kind
            <select
              value={form.kind}
              onChange={(e) => setForm((prev) => ({ ...prev, kind: normalizeKind(e.target.value) }))}
              style={inputStyle}
            >
              {SHOW_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start year
            <input
              value={form.yearStart}
              onChange={(e) => setForm((prev) => ({ ...prev, yearStart: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            End year
            <input
              value={form.yearEnd}
              onChange={(e) => setForm((prev) => ({ ...prev, yearEnd: e.target.value }))}
              style={inputStyle}
            />
          </label>
        </div>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Description"
          style={inputStyle}
        />
        <div style={gridStyle}>
          <label>
            Image URL
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            Image alt text
            <input
              value={form.imageAltText}
              onChange={(e) => setForm((prev) => ({ ...prev, imageAltText: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            Image caption
            <input
              value={form.imageCaption}
              onChange={(e) => setForm((prev) => ({ ...prev, imageCaption: e.target.value }))}
              style={inputStyle}
            />
          </label>
        </div>
        <input
          value={form.tagsText}
          onChange={(e) => setForm((prev) => ({ ...prev, tagsText: e.target.value }))}
          placeholder="Tags (comma separated)"
          style={inputStyle}
        />
      </section>

      {editingSlug && (
        <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.75rem' }}>
          <h2 style={{ margin: 0 }}>Trivia Facts</h2>
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {(editingShow?.trivias ?? []).map((trivia) => (
              <article
                key={trivia.id}
                style={{ borderTop: '2px dashed #000', paddingTop: '.6rem', display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}
              >
                <div>
                  <div>{trivia.text}</div>
                  {trivia.imageUrl && (
                    <div>
                      Image: <a href={trivia.imageUrl} target="_blank" rel="noreferrer">{trivia.imageUrl}</a>
                    </div>
                  )}
                </div>
                <button type="button" className={styles.cta} onClick={() => removeTrivia(trivia.id)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
          <textarea
            value={newTrivia}
            onChange={(e) => setNewTrivia(e.target.value)}
            rows={2}
            placeholder="New trivia text"
            style={inputStyle}
          />
          <input
            value={newTriviaImageUrl}
            onChange={(e) => setNewTriviaImageUrl(e.target.value)}
            placeholder="Optional trivia image URL"
            style={inputStyle}
          />
          <button type="button" className={styles.cta} onClick={addTrivia}>
            Add Trivia
          </button>
        </section>
      )}

      <section style={{ border: '4px solid #000', padding: '.9rem' }}>
        <h2 style={{ marginTop: 0 }}>Catalog</h2>
        <div className={styles.grid}>
          {items.map((show) => (
            <article key={show.slug} className={styles.card}>
              <h3 className={styles.cardTitle}>{show.title}</h3>
              <p className={styles.cardMeta}>
                {show.kind}
                {show.yearStart ? ` | ${show.yearStart}` : ''}
                {show.yearEnd ? `-${show.yearEnd}` : ''}
              </p>
              {show.description && <p>{show.description}</p>}
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button type="button" className={styles.cta} onClick={() => startEdit(show.slug)}>
                  Edit
                </button>
                <PrefetchLink href={`${VAULT_BASE}/${show.kind.toUpperCase()}/${show.slug}`} className={styles.adminLink}>
                  View
                </PrefetchLink>
                <button type="button" className={styles.cta} onClick={() => deleteShow(show.slug)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function parseCsv(value: string): string[] | undefined {
  const tags = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return tags.length > 0 ? tags : undefined;
}

function parseOptionalInt(value: string): number | undefined {
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeKind(value: string): ShowKind {
  if (value === 'TV' || value === 'Film' || value === 'Music' || value === 'Game' || value === 'Other') {
    return value;
  }
  return 'Other';
}

async function safeText(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  return text || `Request failed with status ${res.status}`;
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '.6rem',
  border: '3px solid #000',
  background: '#fff',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: '.5rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};
