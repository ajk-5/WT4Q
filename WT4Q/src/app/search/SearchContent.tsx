"use client";

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import PrefetchLink from '@/components/PrefetchLink';
import { API_ROUTES } from '@/lib/api';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import type { ArticleImage } from '@/lib/models';
import styles from './search.module.css';

type SortOption = 'relevance' | 'date_desc' | 'date_asc';
type HasImagesOption = '' | 'true' | 'false';

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  snippet?: string;
  category: string;
  articleType: string;
  createdDate?: string;
  score?: number;
  views?: number;
  keywords?: string[];
  images?: ArticleImage[];
};

type SearchFacet = {
  value: string;
  label: string;
  count: number;
};

type SearchResponse = {
  query: string;
  sort: SortOption;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: SearchResult[];
  categoryFacets?: SearchFacet[];
};

const QUICK_SEARCHES = [
  '90s jokes',
  'on this day',
  'dial-up internet',
  'console wars',
  'MTV',
  'Blockbuster',
];

const DEFAULT_PAGE_SIZE = '10';

function readSort(value: string | null): SortOption {
  return value === 'date_desc' || value === 'date_asc' || value === 'relevance'
    ? value
    : 'relevance';
}

function readHasImages(value: string | null): HasImagesOption {
  return value === 'true' || value === 'false' ? value : '';
}

function formatDate(value?: string) {
  if (!value) return 'Undated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Undated';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 6);

  if (!tokens.length) return text;

  const regex = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, index) => {
    const isMatch = tokens.some((token) => part.toLowerCase() === token);
    return isMatch ? <mark key={`${part}-${index}`}>{part}</mark> : part;
  });
}

function imageSrc(images?: ArticleImage[]) {
  const first = images?.find((img) => img.photoLink || img.photo);
  if (!first) return undefined;
  return first.photoLink || (first.photo ? `data:image/jpeg;base64,${first.photo}` : undefined);
}

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hasImages, setHasImages] = useState<HasImagesOption>('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const nextSort = readSort(searchParams.get('sort'));
    const nextFrom = searchParams.get('from') || '';
    const nextTo = searchParams.get('to') || '';
    const nextHasImages = readHasImages(searchParams.get('hasImages'));
    const nextPage = Math.max(1, Number(searchParams.get('page') || '1') || 1);

    setQuery(q);
    setCategory(cat);
    setSort(nextSort);
    setFrom(nextFrom);
    setTo(nextTo);
    setHasImages(nextHasImages);
    setPage(nextPage);

    const ac = new AbortController();
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: DEFAULT_PAGE_SIZE,
      sort: nextSort,
    });

    if (q.trim()) params.set('q', q.trim());
    if (cat) params.set('category', cat);
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    if (nextHasImages) params.set('hasImages', nextHasImages);

    setLoading(true);
    setError('');

    fetch(API_ROUTES.ARTICLE.SEARCH_SMART(params.toString()), {
      signal: ac.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setResponse({
          ...data,
          items: Array.isArray(data.items) ? data.items : [],
          categoryFacets: Array.isArray(data.categoryFacets) ? data.categoryFacets : [],
        });
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setResponse(null);
        setError('Search is unavailable right now. Try again in a moment.');
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [paramsKey, searchParams]);

  const activeFilterCount = useMemo(
    () => [category, from, to, hasImages].filter(Boolean).length,
    [category, from, to, hasImages],
  );

  const submitSearch = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (hasImages) params.set('hasImages', hasImages);
    params.set('page', '1');
    router.replace(`/search?${params.toString()}`);
  };

  const updateCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('category', value);
    else params.delete('category');
    params.set('page', '1');
    router.replace(`/search?${params.toString()}`);
  };

  const quickSearch = (value: string) => {
    const params = new URLSearchParams({ q: value, sort: 'relevance', page: '1' });
    router.replace(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('sort', sort);
    params.set('page', '1');
    router.replace(`/search?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`/search?${params.toString()}`);
  };

  const results = response?.items ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 0;
  const facets = response?.categoryFacets ?? [];
  const hasSearched = Boolean(query.trim() || activeFilterCount > 0);

  return (
    <div className={styles.container}>
      <section className={styles.hero} aria-labelledby="search-title">
        <div>
          <span className={styles.kicker}>Archive search</span>
          <h1 id="search-title">Find the exact 90s memory</h1>
          <p>
            Search stories, jokes, time capsules, quizzes, and cultural deep dives with
            filters that keep the archive easy to scan.
          </p>
        </div>

        <form onSubmit={submitSearch} className={styles.form}>
          <label className={styles.searchBox}>
            <Search size={20} aria-hidden="true" />
            <span className={styles.srOnly}>Search query</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: Tamagotchi, 90s jokes, MTV, dial-up..."
              className={styles.input}
            />
          </label>

          <button type="submit" disabled={loading} className={styles.button}>
            <Search size={18} aria-hidden="true" />
            Search
          </button>
        </form>

        <div className={styles.quickRow} aria-label="Popular searches">
          {QUICK_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.quickChip}
              onClick={() => quickSearch(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.shell}>
        <aside className={styles.filters} aria-label="Search filters">
          <div className={styles.panelHeader}>
            <span>
              <SlidersHorizontal size={18} aria-hidden="true" />
              Filters
            </span>
            {activeFilterCount > 0 && (
              <button type="button" className={styles.clearButton} onClick={clearFilters}>
                <X size={14} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          <label className={styles.field}>
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
              <option value="relevance">Best match</option>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All channels</option>
              {CATEGORY_DEFINITIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.dateGrid}>
            <label className={styles.field}>
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>

          <label className={styles.field}>
            <span>Media</span>
            <select value={hasImages} onChange={(e) => setHasImages(readHasImages(e.target.value))}>
              <option value="">Any result</option>
              <option value="true">Has image</option>
              <option value="false">Text only</option>
            </select>
          </label>

          <button type="button" className={styles.applyButton} onClick={() => submitSearch()}>
            Apply filters
          </button>

          {facets.length > 0 && (
            <div className={styles.facets}>
              <h2>Channels</h2>
              {facets.map((facet) => (
                <button
                  key={facet.value}
                  type="button"
                  className={`${styles.facetButton} ${category === facet.value ? styles.activeFacet : ''}`}
                  onClick={() => updateCategory(category === facet.value ? '' : facet.value)}
                >
                  <span>{getCategoryLabel(facet.value)}</span>
                  <strong>{formatCount(facet.count)}</strong>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={styles.resultsPanel} aria-live="polite">
          <div className={styles.resultsHeader}>
            <div>
              <span className={styles.kicker}>
                {hasSearched ? 'Results' : 'Latest archive'}
              </span>
              <h2>
                {loading
                  ? 'Searching...'
                  : total === 1
                    ? '1 match found'
                    : `${formatCount(total)} matches found`}
              </h2>
            </div>
            <div className={styles.resultMeta}>
              <span>
                <CalendarDays size={16} aria-hidden="true" />
                {sort === 'date_asc' ? 'Oldest first' : sort === 'date_desc' ? 'Newest first' : 'Best match'}
              </span>
              {hasImages === 'true' && (
                <span>
                  <ImageIcon size={16} aria-hidden="true" />
                  Images only
                </span>
              )}
            </div>
          </div>

          {error && <div className={styles.notice}>{error}</div>}

          {loading && (
            <div className={styles.skeletonList} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className={styles.empty}>
              <h3>No clean match yet</h3>
              <p>
                Try a broader phrase, remove a date filter, or search for a specific show,
                game, brand, artist, snack, gadget, or 90s habit.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className={styles.results}>
              {results.map((item) => {
                const src = imageSrc(item.images);
                return (
                  <article key={item.id} className={styles.resultCard}>
                    <div className={styles.thumb}>
                      {src ? (
                        <Image
                          src={src}
                          alt={item.images?.[0]?.altText || item.title}
                          fill
                          sizes="120px"
                          style={{ objectFit: 'cover' }}
                          unoptimized={src.startsWith('data:image/')}
                        />
                      ) : (
                        <Search size={22} aria-hidden="true" />
                      )}
                    </div>
                    <div className={styles.resultBody}>
                      <div className={styles.resultLabels}>
                        <span>{getCategoryLabel(item.category)}</span>
                        <span>{formatDate(item.createdDate)}</span>
                        {typeof item.views === 'number' && item.views > 0 && (
                          <span>{formatCount(item.views)} views</span>
                        )}
                      </div>
                      <h3>
                        <PrefetchLink href={`/articles/${item.slug}`}>
                          {highlightText(item.title, query)}
                        </PrefetchLink>
                      </h3>
                      {item.snippet && (
                        <p>{highlightText(item.snippet, query)}</p>
                      )}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className={styles.keywordRow}>
                          {item.keywords.slice(0, 4).map((keyword) => (
                            <span key={keyword}>{keyword}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pager}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
