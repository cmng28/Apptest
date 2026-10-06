import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Heart,
  Library,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { latestEntry, workState } from "../lib/journal";
import type { Journal, Work, WorkType } from "../lib/journal";
import { SAMPLE_JOURNAL } from "../lib/samples";
import { WorkCover } from "./WorkCover";
import "./screens.css";

export interface JournalScreenProps {
  journal: Journal;
  sampleMode: boolean;
  onSampleModeChange: (next: boolean) => void;
}

type Medium = "all" | "art" | "music" | "movies";
type StatusFilter = "all" | "saved" | "experienced" | "liked" | "explore";
const mediums: { id: Medium; label: string }[] = [
  { id: "all", label: "All works" },
  { id: "art", label: "Art" },
  { id: "music", label: "Music" },
  { id: "movies", label: "Movies" },
];
const typeLabel = (type: WorkType) =>
  ({ artwork: "Artwork", song: "Song", album: "Album", movie: "Movie" })[type];

export function JournalSourceSwitch({
  sampleMode,
  onSampleModeChange,
}: Pick<JournalScreenProps, "sampleMode" | "onSampleModeChange">) {
  return (
    <div
      className="journal-source"
      role="group"
      aria-label="Choose journal source"
    >
      <button
        type="button"
        aria-pressed={!sampleMode}
        className={!sampleMode ? "selected" : ""}
        onClick={() => onSampleModeChange(false)}
      >
        My entries
      </button>
      <button
        type="button"
        aria-pressed={sampleMode}
        className={sampleMode ? "selected" : ""}
        onClick={() => onSampleModeChange(true)}
      >
        <Sparkles size={13} /> Sample library
      </button>
    </div>
  );
}

export function SampleBanner() {
  return (
    <aside className="sample-banner" aria-label="Sample data notice">
      <Sparkles size={18} />
      <div>
        <strong>A little inspiration for your first page.</strong>
        <p>
          Sample data · Real works, fictional notes. Covers are illustrative,
          not official artwork. These entries are separate from your journal.
        </p>
      </div>
      <span className="sample-banner-label">JUST A PREVIEW</span>
    </aside>
  );
}

function WorkCard({
  work,
  journal,
  sampleMode,
}: {
  work: Work;
  journal: Journal;
  sampleMode: boolean;
}) {
  const entry = latestEntry(journal, work.id);
  const state = workState(journal, work.id);
  return (
    <a
      className="work-card"
      href={`#/${sampleMode ? "sample" : "item"}/${work.id}`}
    >
      <WorkCover work={work} />
      <div className="card-body">
        <span className="card-eyebrow">
          {typeLabel(work.type)} {work.year && `· ${work.year}`}
        </span>
        <h2>{work.title}</h2>
        <p>{work.creator || "Creator not recorded"}</p>
        <div className="card-meta">
          <span className={`status-pill ${state.liked ? "liked" : ""}`}>
            {state.liked ? (
              <Heart size={12} />
            ) : state.experienced ? (
              <Check size={12} />
            ) : (
              <Bookmark size={12} />
            )}
            {state.liked
              ? "Liked"
              : state.experienced
                ? "Experienced"
                : "Saved"}
          </span>
          {state.toExplore && (
            <span className="card-explore" role="img" aria-label="To explore">
              <Bookmark size={12} />
              <span>To explore</span>
            </span>
          )}
        </div>
        {entry?.tags.length ? (
          <div className="card-tags">
            {entry.tags.slice(0, 2).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            {entry.tags.length > 2 && (
              <span className="more-tags">+{entry.tags.length - 2}</span>
            )}
          </div>
        ) : null}
      </div>
    </a>
  );
}

export function LibraryScreen({
  journal,
  sampleMode,
  onSampleModeChange,
}: JournalScreenProps) {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<Medium>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const source = sampleMode ? SAMPLE_JOURNAL : journal;
  const visibleWorks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return source.works
      .filter((work) => {
        if (medium === "art" && work.type !== "artwork") return false;
        if (medium === "music" && work.type !== "album" && work.type !== "song")
          return false;
        if (medium === "movies" && work.type !== "movie") return false;
        const state = workState(source, work.id);
        if (status === "saved" && !state.saved) return false;
        if (status === "experienced" && !state.experienced) return false;
        if (status === "liked" && !state.liked) return false;
        if (status === "explore" && !state.toExplore) return false;
        const tags = source.entries
          .filter((entry) => entry.workId === work.id)
          .flatMap((entry) => entry.tags);
        return (
          !needle ||
          [work.title, work.creator, ...tags].some((value) =>
            value.toLocaleLowerCase().includes(needle),
          )
        );
      })
      .sort((a, b) => {
        const aEntry = latestEntry(source, a.id);
        const bEntry = latestEntry(source, b.id);
        return (
          (bEntry?.date ?? "").localeCompare(aEntry?.date ?? "") ||
          (bEntry?.createdAt ?? b.createdAt).localeCompare(
            aEntry?.createdAt ?? a.createdAt,
          ) ||
          a.title.localeCompare(b.title)
        );
      });
  }, [source, query, medium, status]);
  const resetFilters = () => {
    setQuery("");
    setMedium("all");
    setStatus("all");
  };
  const changeSource = (next: boolean) => {
    resetFilters();
    onSampleModeChange(next);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE THINGS THAT STAY WITH YOU</p>
          <h1>
            My Library<span className="heading-dot">.</span>
          </h1>
          <p>A collection of what moves you. A little map of your taste.</p>
        </div>
        <a className="button button-primary" href="#/add">
          <Plus size={18} /> Add an entry
        </a>
      </div>
      <div className="library-source-row">
        <JournalSourceSwitch
          sampleMode={sampleMode}
          onSampleModeChange={changeSource}
        />
        <span className="source-privacy">
          <span className="privacy-dot" />
          {sampleMode
            ? "Sample data · Read only"
            : "Your journal · Stored in this browser"}
        </span>
      </div>
      {sampleMode && <SampleBanner />}
      {source.works.length > 0 ? (
        <>
          <div className="library-controls">
            <label className="library-search">
              <Search size={17} />
              <span className="visually-hidden">
                Search works, creators, or tags
              </span>
              <input
                type="search"
                aria-label="Search works, creators, or tags"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a work, creator, or tag…"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <label className="library-status">
              <span className="visually-hidden">Filter by status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
              >
                <option value="all">Everything</option>
                <option value="saved">Saved only</option>
                <option value="experienced">Experienced</option>
                <option value="liked">Liked</option>
                <option value="explore">To explore</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
          <div className="library-filter-row">
            <div
              className="medium-filters"
              role="group"
              aria-label="Filter by medium"
            >
              {mediums.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={medium === item.id}
                  className={medium === item.id ? "active" : ""}
                  onClick={() => setMedium(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="sort-label">
              Latest dated entries <ArrowDown size={13} />
            </span>
          </div>
          <div className="collection-summary" aria-live="polite">
            <span className="collection-label">
              {sampleMode ? "THE SAMPLE COLLECTION" : "YOUR COLLECTION"}{" "}
              <span>{visibleWorks.length}</span>
            </span>
            <span>
              {visibleWorks.length === source.works.length
                ? `${source.works.length} ${source.works.length === 1 ? "work" : "works"}, a world of impressions`
                : `${visibleWorks.length} of ${source.works.length} works`}
            </span>
          </div>
          {visibleWorks.length ? (
            <div className="work-grid">
              {visibleWorks.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  journal={source}
                  sampleMode={sampleMode}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state filter-empty">
              <Search size={30} />
              <h2>Nothing on this page just yet.</h2>
              <p>Try another title, creator, tag, or filter.</p>
              <button
                type="button"
                className="button button-quiet"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          )}
          <p className="cover-caption">
            A small visual cue: covers are locally drawn illustrations, not
            official artwork.
          </p>
        </>
      ) : (
        <>
          <div className="library-toolbar">
            <span className="collection-label">
              YOUR COLLECTION <span>0</span>
            </span>
            <span className="sort-label">Ready for your first note</span>
          </div>
          <div className="empty-state">
            <div className="empty-illustration">
              <Library size={36} />
              <Sparkles size={19} />
            </div>
            <p className="eyebrow">A BLANK PAGE, IN THE BEST WAY</p>
            <h2>
              Your taste starts
              <br />
              with a little noticing.
            </h2>
            <p>
              A painting you lingered over. An album on repeat.
              <br />A film that left you feeling something. Keep it here.
            </p>
            <a className="button button-primary" href="#/add">
              Add your first entry <ArrowRight size={17} />
            </a>
          </div>
          <section className="sample-preview">
            <div className="sample-preview-heading">
              <div>
                <p className="eyebrow">
                  SAMPLE DATA · SEPARATE FROM YOUR JOURNAL
                </p>
                <h2>A peek at the sample library</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => changeSource(true)}
              >
                Explore the samples <ArrowRight size={15} />
              </button>
            </div>
            <p className="sample-preview-note">
              Real works, fictional notes. Illustrative covers, not official
              artwork.
            </p>
            <div className="work-grid">
              {SAMPLE_JOURNAL.works.slice(0, 3).map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  journal={SAMPLE_JOURNAL}
                  sampleMode
                />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
