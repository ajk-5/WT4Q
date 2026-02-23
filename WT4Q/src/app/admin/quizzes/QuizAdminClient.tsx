'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES, apiFetch } from '@/lib/api';
import type { QuizType } from '@/lib/quizzes.types';
import type { Show } from '@/lib/shows.types';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import styles from '@/app/born-in-the-90s/retro.module.css';
import { VAULT_BASE } from '@/lib/vaultPaths';

const QUIZ_TYPES: QuizType[] = ['trivia', 'who-said-it', 'finish-the-line'];

type QuizListItem = {
  slug: string;
  title: string;
  category?: string;
  type?: string;
  status?: string;
  createdAt?: string;
};

type QuizApiQuestion = {
  id?: string;
  prompt: string;
  imageUrl?: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  points?: number;
  difficulty?: string;
  order?: number;
};

type QuizApiDetail = QuizListItem & {
  description?: string;
  author?: string;
  imageUrl?: string;
  tags?: string[];
  randomize?: boolean;
  timeLimitSec?: number;
  showExplanations?: boolean;
  show?: { slug: string; title: string; kind: string; imageUrl?: string } | null;
  questions: QuizApiQuestion[];
};

type QuizUpsertQuestion = {
  prompt: string;
  imageUrl?: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  points?: number;
  difficulty?: string;
  order?: number;
};

type QuizUpsertPayload = {
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  type: string;
  author?: string;
  imageUrl?: string;
  tags?: string[];
  randomize?: boolean;
  timeLimitSec?: number;
  showExplanations?: boolean;
  status?: string;
  publishedAtUtc?: string | null;
  showSlug?: string;
  showId?: string;
  questions: QuizUpsertQuestion[];
};

type AiQuizGenerateResponse = {
  quiz: QuizUpsertPayload;
  published: boolean;
  slug?: string;
};

type DraftQuestion = {
  id: string;
  prompt: string;
  imageUrl: string;
  choicesText: string;
  answer: string;
  explanation: string;
  points: number;
  difficulty: string;
};

type QuizDraft = {
  title: string;
  description: string;
  category: string;
  type: QuizType;
  author: string;
  imageUrl: string;
  tagsText: string;
  randomize: boolean;
  timeLimitSec: string;
  showExplanations: boolean;
  status: 'draft' | 'published';
  questions: DraftQuestion[];
};

const DEFAULT_DRAFT: QuizDraft = {
  title: '',
  description: '',
  category: 'Entertainment',
  type: 'trivia',
  author: 'Editor',
  imageUrl: '',
  tagsText: '90s, nostalgia',
  randomize: true,
  timeLimitSec: '420',
  showExplanations: true,
  status: 'published',
  questions: [
    {
      id: makeLocalId(),
      prompt: '',
      imageUrl: '',
      choicesText: '',
      answer: '',
      explanation: '',
      points: 1,
      difficulty: 'medium',
    },
  ],
};

export default function QuizAdminClient() {
  const admin = useAdminGuard();

  const [items, setItems] = useState<QuizListItem[]>([]);
  const [draft, setDraft] = useState<QuizDraft>(DEFAULT_DRAFT);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showQuery, setShowQuery] = useState('');
  const [showResults, setShowResults] = useState<Show[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  const [aiTopic, setAiTopic] = useState('');
  const [aiType, setAiType] = useState<QuizType>('trivia');
  const [aiCategory, setAiCategory] = useState('Entertainment');
  const [aiCount, setAiCount] = useState('10');
  const [aiTitleHint, setAiTitleHint] = useState('');
  const [aiPublish, setAiPublish] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [generatedJson, setGeneratedJson] = useState('');

  const previewSlug = useMemo(() => {
    const source = editingSlug || draft.title || 'untitled';
    return slugify(source);
  }, [draft.title, editingSlug]);

  useEffect(() => {
    if (!admin) return;
    void loadList();
  }, [admin]);

  async function loadList() {
    setError(null);
    try {
      let res = await apiFetch(API_ROUTES.QUIZ.LIST(true));
      if (!res.ok) {
        res = await apiFetch(API_ROUTES.QUIZ.LIST(false));
      }
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      const data = (await res.json()) as QuizListItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    }
  }

  async function searchShows() {
    setError(null);
    try {
      const res = await apiFetch(API_ROUTES.SHOW.LIST(showQuery, '', 1, 10));
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      const payload = (await res.json()) as { items?: Show[] };
      setShowResults(payload.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Show search failed');
    }
  }

  async function editQuiz(slug: string) {
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(API_ROUTES.QUIZ.GET(slug));
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      const data = (await res.json()) as QuizApiDetail;
      hydrateDraft(data);
      setEditingSlug(slug);
      setMessage(`Editing '${data.title}'`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    }
  }

  async function deleteQuiz(slug: string) {
    if (!confirm(`Delete quiz '${slug}'?`)) return;
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(API_ROUTES.QUIZ.DELETE(slug), { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await safeText(res));
      }
      if (editingSlug === slug) {
        clearForm();
      }
      setMessage('Quiz deleted');
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    }
  }

  async function generateFromAi() {
    setError(null);
    setMessage(null);
    if (!aiTopic.trim()) {
      setError('Topic is required');
      return;
    }

    const count = Number.parseInt(aiCount, 10);
    if (!Number.isFinite(count) || count < 5 || count > 20) {
      setError('Question count must be between 5 and 20');
      return;
    }

    setAiBusy(true);
    try {
      const payload = {
        topic: aiTopic.trim(),
        type: aiType,
        category: aiCategory.trim() || 'Entertainment',
        questionCount: count,
        titleHint: aiTitleHint.trim() || undefined,
        showSlug: selectedShow?.slug,
        publish: aiPublish,
      };

      const res = await apiFetch(API_ROUTES.QUIZ.AI_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await safeText(res));
      }

      const data = (await res.json()) as AiQuizGenerateResponse;
      if (!data.quiz) {
        throw new Error('AI response did not include a quiz');
      }

      hydrateDraft(data.quiz);
      setGeneratedJson(JSON.stringify(data.quiz, null, 2));
      setEditingSlug(data.slug ?? null);
      if (data.published && data.slug) {
        setMessage(`AI generated and published: ${VAULT_BASE}/${data.slug}`);
        await loadList();
      } else {
        setMessage('AI generated quiz JSON loaded into form. Review and save.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiBusy(false);
    }
  }

  async function saveQuiz() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const validQuestions = draft.questions.filter(
        (q) => q.prompt.trim().length > 0 && q.answer.trim().length > 0,
      );
      if (validQuestions.length === 0) {
        throw new Error('Add at least one question with prompt and answer');
      }

      const payload: QuizUpsertPayload = {
        slug: editingSlug ?? undefined,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        category: draft.category.trim() || undefined,
        type: draft.type,
        author: draft.author.trim() || undefined,
        imageUrl: draft.imageUrl.trim() || undefined,
        tags: parseCsv(draft.tagsText),
        randomize: draft.randomize,
        timeLimitSec: parseOptionalInt(draft.timeLimitSec),
        showExplanations: draft.showExplanations,
        status: draft.status,
        showSlug: selectedShow?.slug,
        questions: validQuestions.map((q, idx) => ({
          prompt: q.prompt.trim(),
          imageUrl: q.imageUrl.trim() || undefined,
          choices: parseCsv(q.choicesText),
          answer: q.answer.trim(),
          explanation: q.explanation.trim() || undefined,
          points: Number.isFinite(q.points) && q.points > 0 ? q.points : 1,
          difficulty: q.difficulty.trim() || undefined,
          order: idx,
        })),
      };

      if (!payload.title) throw new Error('Title is required');

      const isEdit = Boolean(editingSlug);
      const res = await apiFetch(
        isEdit ? API_ROUTES.QUIZ.UPDATE(editingSlug as string) : API_ROUTES.QUIZ.CREATE,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        throw new Error(await safeText(res));
      }

      const response = (await res.json()) as { slug?: string };
      if (response.slug) {
        setEditingSlug(response.slug);
      }
      setMessage(`Saved quiz. Preview: ${VAULT_BASE}/${response.slug ?? previewSlug}`);
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setBusy(false);
    }
  }

  function clearForm() {
    setDraft({
      ...DEFAULT_DRAFT,
      questions: [{ ...DEFAULT_DRAFT.questions[0], id: makeLocalId() }],
    });
    setEditingSlug(null);
    setSelectedShow(null);
    setGeneratedJson('');
  }

  function hydrateDraft(source: QuizUpsertPayload | QuizApiDetail) {
    const questions = (source.questions ?? []).map((q, idx) => ({
      id: (source as QuizApiDetail).questions?.[idx]?.id || makeLocalId(),
      prompt: q.prompt ?? '',
      imageUrl: q.imageUrl ?? '',
      choicesText: (q.choices ?? []).join(', '),
      answer: q.answer ?? '',
      explanation: q.explanation ?? '',
      points: q.points && q.points > 0 ? q.points : 1,
      difficulty: q.difficulty ?? 'medium',
    }));

    setDraft({
      title: source.title ?? '',
      description: source.description ?? '',
      category: source.category ?? 'Entertainment',
      type: normalizeType(source.type ?? 'trivia'),
      author: source.author ?? 'Editor',
      imageUrl: source.imageUrl ?? '',
      tagsText: (source.tags ?? []).join(', '),
      randomize: source.randomize ?? true,
      timeLimitSec: source.timeLimitSec ? String(source.timeLimitSec) : '420',
      showExplanations: source.showExplanations ?? true,
      status: source.status === 'draft' ? 'draft' : 'published',
      questions: questions.length > 0 ? questions : DEFAULT_DRAFT.questions,
    });

    const show = (source as QuizApiDetail).show;
    if (show) {
      setSelectedShow({
        slug: show.slug,
        title: show.title,
        kind: (show.kind || 'Other') as Show['kind'],
        imageUrl: show.imageUrl,
      });
    } else {
      setSelectedShow(null);
    }
  }

  function addQuestion() {
    setDraft((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: makeLocalId(),
          prompt: '',
          imageUrl: '',
          choicesText: '',
          answer: '',
          explanation: '',
          points: 1,
          difficulty: 'medium',
        },
      ],
    }));
  }

  function removeQuestion(index: number) {
    setDraft((prev) => {
      const next = prev.questions.filter((_, idx) => idx !== index);
      return {
        ...prev,
        questions: next.length > 0 ? next : prev.questions,
      };
    });
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === index ? { ...q, ...patch } : q)),
    }));
  }

  if (!admin) return null;

  return (
    <div style={{ maxWidth: 1100, margin: '1rem auto', display: 'grid', gap: '1rem' }}>
      <section className={styles.hero}>
        <h1 className={styles.mast}>90s Quiz Admin</h1>
        <p className={styles.tag}>
          Generate quiz JSON with Gemini, then review and publish to the 90s Exclusive vault.
        </p>
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
        <PrefetchLink href="/admin/dashboard" className={styles.adminLink}>Dashboard</PrefetchLink>
        <PrefetchLink href="/admin/shows" className={styles.adminLink}>Manage Shows</PrefetchLink>
        <PrefetchLink href={VAULT_BASE} className={styles.adminLink}>90s Exclusive</PrefetchLink>
      </section>

      {error && <div style={{ color: '#8a0000', fontWeight: 700 }}>{error}</div>}
      {message && <div style={{ color: '#114900', fontWeight: 700 }}>{message}</div>}

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>AI Quiz Generator</h2>
        <input
          value={aiTopic}
          onChange={(e) => setAiTopic(e.target.value)}
          placeholder="Topic: 90s sitcom one-liners, arcade classics, MTV era hits..."
          style={inputStyle}
        />
        <div style={grid3Style}>
          <label>
            Type
            <select value={aiType} onChange={(e) => setAiType(normalizeType(e.target.value))} style={inputStyle}>
              {QUIZ_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <input value={aiCategory} onChange={(e) => setAiCategory(e.target.value)} style={inputStyle} />
          </label>
          <label>
            Questions (5-20)
            <input value={aiCount} onChange={(e) => setAiCount(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <input
          value={aiTitleHint}
          onChange={(e) => setAiTitleHint(e.target.value)}
          placeholder="Optional title hint"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
            <input
              type="checkbox"
              checked={aiPublish}
              onChange={(e) => setAiPublish(e.target.checked)}
            />
            Publish immediately
          </label>
          <button type="button" className={styles.cta} onClick={generateFromAi} disabled={aiBusy}>
            {aiBusy ? 'Generating...' : 'Generate with Gemini'}
          </button>
        </div>
        <textarea
          value={generatedJson}
          onChange={(e) => setGeneratedJson(e.target.value)}
          rows={10}
          placeholder="Generated JSON appears here."
          style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
        />
      </section>

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.75rem' }}>
        <h2 style={{ margin: 0 }}>{editingSlug ? `Edit Quiz: ${editingSlug}` : 'Create Quiz'}</h2>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className={styles.cta} onClick={saveQuiz} disabled={busy}>
            {busy ? 'Saving...' : 'Save Quiz'}
          </button>
          <button type="button" className={styles.cta} onClick={clearForm}>
            New Quiz
          </button>
          <span>Preview URL: {VAULT_BASE}/{previewSlug}</span>
        </div>

        <input
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Quiz title"
          style={inputStyle}
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Description"
          style={inputStyle}
        />
        <div style={grid3Style}>
          <label>
            Category
            <input
              value={draft.category}
              onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            Type
            <select
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: normalizeType(e.target.value) }))}
              style={inputStyle}
            >
              {QUIZ_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, status: e.target.value === 'draft' ? 'draft' : 'published' }))
              }
              style={inputStyle}
            >
              <option value="published">published</option>
              <option value="draft">draft</option>
            </select>
          </label>
        </div>
        <div style={grid3Style}>
          <label>
            Author
            <input
              value={draft.author}
              onChange={(e) => setDraft((prev) => ({ ...prev, author: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            Cover image URL
            <input
              value={draft.imageUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label>
            Tags (comma separated)
            <input
              value={draft.tagsText}
              onChange={(e) => setDraft((prev) => ({ ...prev, tagsText: e.target.value }))}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={grid3Style}>
          <label>
            Time limit seconds
            <input
              value={draft.timeLimitSec}
              onChange={(e) => setDraft((prev) => ({ ...prev, timeLimitSec: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
            <input
              type="checkbox"
              checked={draft.randomize}
              onChange={(e) => setDraft((prev) => ({ ...prev, randomize: e.target.checked }))}
            />
            Randomize question order
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
            <input
              type="checkbox"
              checked={draft.showExplanations}
              onChange={(e) => setDraft((prev) => ({ ...prev, showExplanations: e.target.checked }))}
            />
            Show explanations
          </label>
        </div>
      </section>

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.65rem' }}>
        <h2 style={{ margin: 0 }}>Link Show or Film (optional)</h2>
        {selectedShow ? (
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>{selectedShow.title}</strong>
            <span>({selectedShow.kind})</span>
            <button type="button" className={styles.cta} onClick={() => setSelectedShow(null)}>
              Clear
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <input
                value={showQuery}
                onChange={(e) => setShowQuery(e.target.value)}
                placeholder="Search shows..."
                style={{ ...inputStyle, flex: 1, minWidth: 240 }}
              />
              <button type="button" className={styles.cta} onClick={searchShows}>
                Search
              </button>
            </div>
            {showResults.length > 0 && (
              <div style={{ display: 'grid', gap: '.35rem' }}>
                {showResults.map((show) => (
                  <button
                    type="button"
                    key={show.slug}
                    onClick={() => {
                      setSelectedShow(show);
                      setShowResults([]);
                      setShowQuery('');
                    }}
                    style={{
                      border: '3px solid #000',
                      background: '#fff',
                      textAlign: 'left',
                      padding: '.35rem .5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <strong>{show.title}</strong> ({show.kind})
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section style={{ border: '4px solid #000', padding: '.9rem', display: 'grid', gap: '.8rem' }}>
        <h2 style={{ margin: 0 }}>Questions</h2>
        {draft.questions.map((question, index) => (
          <article key={question.id} style={{ borderTop: '2px dashed #000', paddingTop: '.75rem', display: 'grid', gap: '.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'center' }}>
              <strong>Question {index + 1}</strong>
              <button type="button" className={styles.cta} onClick={() => removeQuestion(index)}>
                Remove
              </button>
            </div>
            <input
              value={question.prompt}
              onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
              placeholder="Prompt"
              style={inputStyle}
            />
            <input
              value={question.imageUrl}
              onChange={(e) => updateQuestion(index, { imageUrl: e.target.value })}
              placeholder="Optional image URL"
              style={inputStyle}
            />
            <input
              value={question.choicesText}
              onChange={(e) => updateQuestion(index, { choicesText: e.target.value })}
              placeholder="Choices (comma separated)"
              style={inputStyle}
            />
            <input
              value={question.answer}
              onChange={(e) => updateQuestion(index, { answer: e.target.value })}
              placeholder="Correct answer"
              style={inputStyle}
            />
            <input
              value={question.explanation}
              onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
              placeholder="Optional explanation"
              style={inputStyle}
            />
            <div style={grid3Style}>
              <label>
                Points
                <input
                  value={String(question.points)}
                  onChange={(e) =>
                    updateQuestion(index, { points: Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1) })
                  }
                  style={inputStyle}
                />
              </label>
              <label>
                Difficulty
                <select
                  value={question.difficulty}
                  onChange={(e) => updateQuestion(index, { difficulty: e.target.value })}
                  style={inputStyle}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </label>
            </div>
          </article>
        ))}
        <button type="button" className={styles.cta} onClick={addQuestion}>
          + Add Question
        </button>
      </section>

      <section style={{ border: '4px solid #000', padding: '.9rem' }}>
        <h2 style={{ marginTop: 0 }}>Existing Quizzes</h2>
        <div className={styles.grid}>
          {items.map((item) => (
            <article key={item.slug} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardMeta}>
                {item.category || 'General'} | {item.type || 'trivia'} | {item.status || 'published'}
              </p>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button type="button" className={styles.cta} onClick={() => editQuiz(item.slug)}>
                  Edit
                </button>
                <PrefetchLink href={`${VAULT_BASE}/${item.slug}`} className={styles.adminLink}>
                  Preview
                </PrefetchLink>
                <button type="button" className={styles.cta} onClick={() => deleteQuiz(item.slug)}>
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

function normalizeType(value: string): QuizType {
  if (value === 'who-said-it' || value === 'finish-the-line' || value === 'trivia') return value;
  return 'trivia';
}

function parseCsv(value: string): string[] | undefined {
  const parts = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parts.length > 0 ? parts : undefined;
}

function parseOptionalInt(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function slugify(value: string): string {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'untitled';
}

function makeLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const grid3Style: CSSProperties = {
  display: 'grid',
  gap: '.5rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};
