import { Metadata } from "next";
import { notFound } from "next/navigation";
import { VT323 } from "next/font/google";
import { API_ROUTES } from "@/lib/api";
import QuizRunner from "@/components/quizzes/QuizRunner";
import RetroBackLink from "@/components/RetroBackLink";
import styles from "../retro.module.css";
import { VAULT_BASE } from "@/lib/vaultPaths";

type Props = { params: Promise<{ slug: string }> };

const retro = VT323({ weight: "400", subsets: ["latin"], variable: "--retro-font" });

export async function generateMetadata(p: Props): Promise<Metadata> {
  const { slug } = await p.params;
  const res = await fetch(API_ROUTES.QUIZ.GET(slug), { next: { revalidate: 60 } });
  if (!res.ok) return {};
  const quiz = await res.json();
  if (!quiz) return {};
  const title = `${quiz.title} - 90s Exclusive | The Nineties Times`;
  const description = quiz.description || "Play this exclusive 90s quiz by The Nineties Times.";
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function QuizPage(p: Props) {
  const { slug } = await p.params;
  const res = await fetch(API_ROUTES.QUIZ.GET(slug), { next: { revalidate: 60 } });
  if (!res.ok) {
    notFound();
  }
  const quiz = await res.json();
  if (!quiz) notFound();
  return (
    <div className={`${retro.variable} ${styles.retroTheme} ${styles.page}`} style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className={styles.noise} aria-hidden="true" />
      <section className={styles.showHero}>
        <div className={styles.heroBackWrap}>
          <RetroBackLink label="Back to vault" href={VAULT_BASE} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Interactive Quiz</span>
          <h1 className={styles.heroTitle}>{quiz.title}</h1>
          {quiz.description && <p className={styles.heroSubtitle}>{quiz.description}</p>}
        </div>
      </section>
      <QuizRunner quiz={quiz} />
    </div>
  );
}

