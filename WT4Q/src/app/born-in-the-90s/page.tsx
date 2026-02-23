import { Metadata } from "next";
import Link from "next/link";
import { API_ROUTES } from "@/lib/api";
import { publicMediaUrl } from "@/lib/media";
import type { Show } from "@/lib/shows.types";
import ArticleCard, { Article as EditorialArticle } from "@/components/ArticleCard";
import QuizBestScore from "@/components/quizzes/QuizBestScore";
import BornShowThumbImage from "@/components/BornShowThumbImage";
import styles from "./index.module.css";
import { VAULT_BASE } from "@/lib/vaultPaths";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "90s Exclusive - Quizzes & Vault | The Nineties Times",
  description:
    "90s Exclusive is a curated vault of quizzes, trivia, and nostalgia challenges across movies, TV, music, games, and more.",
  openGraph: {
    title: "90s Exclusive - Quizzes & Vault",
    description:
      "Exclusive 90s quizzes and trivia by The Nineties Times. Test your knowledge on movies, TV shows, music, sports, and pop culture.",
    type: "website",
  },
};

type QuizCard = {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  createdAt?: string;
  type: string;
  imageUrl?: string;
  status?: string;
};

type PagedResult<T> = { items?: T[] };

type SearchParams = Promise<{ q?: string; kind?: string }>;

const tickerItems = [
  "Blockbuster nights",
  "Mixtape drops",
  "Laser-tag champions",
  "Dial-up symphonies",
  "After-school reruns",
  "Arcade bragging rights",
];

async function fetchEditorialQuizzes(): Promise<EditorialArticle[]> {
  const params = new URLSearchParams({
    type: "QnA",
    page: "1",
    pageSize: "8",
    sort: "date_desc",
  });
  try {
    const res = await fetch(API_ROUTES.ARTICLE.SEARCH_PAGED(params.toString()), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as PagedResult<EditorialArticle>;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export default async function Remembering90sPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let quizzes: QuizCard[] = [];
  let shows: Show[] = [];
  const editorialQuizzes = await fetchEditorialQuizzes();

  try {
    const res = await fetch(API_ROUTES.QUIZ.LIST(false), { next: { revalidate: 60 } });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) {
      quizzes = (await res.json()) as QuizCard[];
    }
  } catch {}

  try {
    const sp = (await searchParams) || {};
    const q = sp.q || "";
    const kind = sp.kind || "";
    const res = await fetch(API_ROUTES.SHOW.LIST(q, kind, 1, 20), { next: { revalidate: 60 } });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) {
      const data = (await res.json()) as { items: Show[] };
      shows = data.items || [];
    }
  } catch {}

  const sp = await searchParams;
  const qParam = sp?.q || "";
  const kindParam = sp?.kind || "";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Exclusive Vault</span>
          <h1 className={styles.heroTitle}>90s Exclusive</h1>
          <p className={styles.heroSubtitle}>
            A timeline of pop-culture deep cuts, VHS memories, and quizzes only true 90s kids can ace.
          </p>
          <div className={styles.heroButtons}>
            <Link href="#quizzes" className={styles.ctaPrimary}>
              Play a quiz -&gt;
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {tickerItems.concat(tickerItems).map((item, i) => (
            <span className={styles.tickerItem} key={`${item}-${i}`}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section id="shows" className={styles.section}>
        <div className={styles.sectionHeading}>Shows & Films Vault</div>
        <p className={styles.sectionSubhead}>
          Queue up the mixtape, pick a crew, and dive back into stories you remember from school nights and weekend reruns.
        </p>
        <form method="get" action={VAULT_BASE} className={styles.searchForm}>
          <input
            name="q"
            defaultValue={qParam}
            placeholder="Search shows (e.g., Friends)"
            className={styles.searchInput}
          />
          <select name="kind" defaultValue={kindParam} className={styles.searchSelect}>
            <option value="">All</option>
            <option value="TV">TV</option>
            <option value="Film">Film</option>
            <option value="Music">Music</option>
            <option value="Game">Game</option>
            <option value="Other">Other</option>
          </select>
          <button className={styles.ctaSecondary}>Search vault</button>
        </form>

        <div className={styles.grid}>
          {shows.map((s) => {
            const src = publicMediaUrl(s.stableImageUrl || s.imageUrl);
            const kindSegment = (s.kind || "other").toUpperCase();
            return (
              <article key={s.slug} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.chipRow}>
                    <span className={styles.chip}>{s.kind || "Retro"}</span>
                    {s.yearStart && (
                      <span className={styles.chip}>
                        {s.yearStart}
                        {s.yearEnd ? `-${s.yearEnd}` : ""}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>{s.title}</h3>
                  <p className={styles.cardMeta}>
                    {s.createdAt ? `Filed ${new Date(s.createdAt).toLocaleDateString()}` : "Fresh from the vault"}
                  </p>
                </div>

                <div className={styles.thumb}>
                  {src ? (
                    <BornShowThumbImage
                      src={src}
                      alt={s.imageAltText || `${s.title} 90s show card on The Nineties Times (90sTimes)`}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.thumbFallback}>
                      <span className={styles.thumbFallbackLine}>Showcase</span>
                      <strong className={styles.thumbFallbackTitle}>{s.title}</strong>
                    </div>
                  )}
                </div>

                {s.description && (
                  <p className={styles.cardBody}>
                    {s.description.length > 150 ? `${s.description.slice(0, 147)}...` : s.description}
                  </p>
                )}

                {s.tags && s.tags.length > 0 && (
                  <div className={styles.tagList}>
                    {s.tags.slice(0, 3).map((tag) => (
                      <span className={styles.tag} key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.cardFooter}>
                <Link href={`${VAULT_BASE}/${kindSegment}/${s.slug}`} className={styles.ctaLink}>
                    View memories -&gt;
                  </Link>
                </div>
              </article>
            );
          })}

          {shows.length === 0 && (
            <article className={`${styles.card} ${styles.emptyCard}`}>
              <h3 className={styles.cardTitle}>No shows yet</h3>
              <p>Use the admin panel to add shows and films.</p>
            </article>
          )}
        </div>
      </section>

      <div className={styles.listDivider} />

      <section id="editor-quizzes" className={styles.section}>
        <div className={styles.sectionHeading}>Editor Q&amp;A Quizzes</div>
        <p className={styles.sectionSubhead}>
          Classic 90s trivia and pop-culture Q&amp;A from the newsroom.
        </p>

        <div className={styles.grid}>
          {editorialQuizzes.length === 0 ? (
            <article className={`${styles.card} ${styles.emptyCard}`}>
              <h2 className={styles.cardTitle}>No editor quizzes yet</h2>
              <p>Quizzes are warming up. Check back soon for fresh drops.</p>
            </article>
          ) : (
            editorialQuizzes.map((quiz) => <ArticleCard key={quiz.id} article={quiz} />)
          )}
        </div>
      </section>

      <div className={styles.listDivider} />

      <section id="quizzes" className={styles.section}>
        <div className={styles.sectionHeading}>Playable Quizzes</div>
        <p className={styles.sectionSubhead}>
          Rapid-fire trivia, finish-the-line challenges, and &quot;who said it?&quot; showdowns from the editors.
        </p>

        <div className={styles.grid}>
          {quizzes.map((q) => (
            <article key={q.slug} className={`${styles.card} ${styles.quizCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.quizType}>{(q.category || "General").toUpperCase()}</span>
                <h2 className={styles.cardTitle}>{q.title}</h2>
                <p className={styles.cardMeta}>
                  {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "Fresh upload"} | {q.type}
                </p>
                <QuizBestScore slug={q.slug} className={styles.quizBestScore} />
              </div>
              {q.description && <p className={styles.cardBody}>{q.description}</p>}
              <div className={styles.cardFooter}>
                <Link href={`${VAULT_BASE}/${q.slug}`} className={styles.ctaPrimary}>
                  Play now
                </Link>
              </div>
            </article>
          ))}

          {quizzes.length === 0 && (
            <article className={`${styles.card} ${styles.emptyCard}`}>
              <h2 className={styles.cardTitle}>No quizzes yet</h2>
              <p>Check back soon for new 90s quizzes.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
