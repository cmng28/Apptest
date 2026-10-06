import {
  ArrowRight,
  Bookmark,
  Check,
  Film,
  Heart,
  Library,
  Music2,
  Palette,
  Sparkles,
} from "lucide-react";
import { latestEntry, workState } from "../lib/journal";
import { SAMPLE_JOURNAL } from "../lib/samples";
import { JournalSourceSwitch, SampleBanner } from "./LibraryScreen";
import type { JournalScreenProps } from "./LibraryScreen";
import { WorkCover } from "./WorkCover";
import "./screens.css";

export function TasteScreen({
  journal,
  sampleMode,
  onSampleModeChange,
}: JournalScreenProps) {
  const source = sampleMode ? SAMPLE_JOURNAL : journal;
  const works = source.works.map((work) => ({
    work,
    state: workState(source, work.id),
  }));
  const liked = works.filter((item) => item.state.liked);
  const experienced = works.filter((item) => item.state.experienced);
  const explore = works.filter((item) => item.state.toExplore);
  const stats = [
    {
      label: "Works collected",
      value: works.length,
      icon: Library,
      caption: "A little world of your own",
    },
    {
      label: "Experienced",
      value: experienced.length,
      icon: Check,
      caption: "Seen, heard, or watched",
    },
    {
      label: "Currently liked",
      value: liked.length,
      icon: Heart,
      caption: "Your latest experienced reactions",
    },
    {
      label: "To explore",
      value: explore.length,
      icon: Bookmark,
      caption: "Something to return to",
    },
  ];
  const media = [
    {
      label: "Art",
      icon: Palette,
      count: works.filter(({ work }) => work.type === "artwork").length,
      className: "art",
    },
    {
      label: "Music",
      icon: Music2,
      count: works.filter(
        ({ work }) => work.type === "song" || work.type === "album",
      ).length,
      className: "music",
    },
    {
      label: "Movies",
      icon: Film,
      count: works.filter(({ work }) => work.type === "movie").length,
      className: "movies",
    },
  ];
  const tagCounts = new Map<string, { label: string; count: number }>();
  works.forEach(({ work }) => {
    const seen = new Set<string>();
    latestEntry(source, work.id)?.tags.forEach((tag) => {
      const normalized = tag.trim().toLocaleLowerCase();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      const current = tagCounts.get(normalized);
      tagCounts.set(normalized, {
        label: current?.label ?? tag.trim(),
        count: (current?.count ?? 0) + 1,
      });
    });
  });
  const tags = [...tagCounts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ALWAYS A WORK IN PROGRESS</p>
          <h1>
            My Taste<span className="heading-dot">.</span>
          </h1>
          <p>Not a score. Just a reflection of what you’ve noticed.</p>
        </div>
      </div>
      <div className="library-source-row">
        <JournalSourceSwitch
          sampleMode={sampleMode}
          onSampleModeChange={onSampleModeChange}
        />
        <span className="source-privacy">
          <span className="privacy-dot" />
          {sampleMode
            ? "Sample summary · Fictional reactions"
            : "Made from your own journal"}
        </span>
      </div>
      {sampleMode && <SampleBanner />}
      <div className="taste-stats">
        {stats.map(({ label, value, icon: Icon, caption }) => (
          <article className="taste-stat" key={label}>
            <span className="taste-stat-icon">
              <Icon size={18} />
            </span>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{caption}</small>
          </article>
        ))}
      </div>
      {!works.length ? (
        <div className="empty-state taste-empty">
          <div className="empty-illustration">
            <Heart size={34} />
            <Sparkles size={18} />
          </div>
          <p className="eyebrow">A REFLECTION, AT YOUR OWN PACE</p>
          <h2>
            A little more you,
            <br />
            with every entry.
          </h2>
          <p>
            Your taste summary grows from the things you record.
            <br />
            There’s no need to rate everything. A note is enough.
          </p>
          <a className="button button-primary" href="#/add">
            Add an entry <ArrowRight size={17} />
          </a>
        </div>
      ) : (
        <>
          <div className="taste-panels">
            <section className="taste-panel medium-panel">
              <p className="eyebrow">THE SHAPE OF YOUR COLLECTION</p>
              <h2>A few different worlds.</h2>
              <p className="panel-intro">
                All collected works, including those saved for later.
              </p>
              <div className="medium-breakdown">
                {media.map(({ label, icon: Icon, count, className }) => (
                  <div className="medium-row" key={label}>
                    <div className="medium-row-label">
                      <span>
                        <Icon size={15} />
                        {label}
                      </span>
                      <span>
                        {count} {count === 1 ? "work" : "works"}
                      </span>
                    </div>
                    <div className="medium-track">
                      <span
                        className={className}
                        style={{
                          width: `${works.length ? (count / works.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="taste-panel tag-panel">
              <p className="eyebrow">WORDS YOU COME BACK TO</p>
              <h2>Your recurring threads.</h2>
              <p className="panel-intro">
                Tags from each work’s latest dated entry.
              </p>
              {tags.length ? (
                <div className="taste-tags">
                  {tags.map((tag) => (
                    <span key={tag.label}>
                      {tag.label}
                      <small>{tag.count}</small>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="panel-empty">
                  Add a few tags to your entries and your threads will appear
                  here.
                </p>
              )}
              <p className="panel-footnote">
                The number is how many works share that tag.
              </p>
            </section>
          </div>
          <section className="taste-liked">
            <div className="sample-preview-heading">
              <div>
                <p className="eyebrow">
                  {sampleMode
                    ? "FICTIONAL REACTIONS IN THE SAMPLE LIBRARY"
                    : "THINGS THAT FEEL LIKE YOU, RIGHT NOW"}
                </p>
                <h2>
                  Currently liked<span className="heading-dot">.</span>
                </h2>
              </div>
              <a href="#/library" className="text-button">
                Back to the library <ArrowRight size={15} />
              </a>
            </div>
            <p className="taste-liked-note">
              Based on the latest dated experienced entry for each work. Your
              earlier feelings stay in its history.
            </p>
            {liked.length ? (
              <div className="liked-work-grid">
                {liked.map(({ work }) => (
                  <a
                    className="liked-work"
                    href={`#/${sampleMode ? "sample" : "item"}/${work.id}`}
                    key={work.id}
                  >
                    <WorkCover work={work} />
                    <div>
                      <span className="card-eyebrow">
                        {
                          {
                            artwork: "Artwork",
                            song: "Song",
                            album: "Album",
                            movie: "Movie",
                          }[work.type]
                        }
                      </span>
                      <h3>{work.title}</h3>
                      <p>{work.creator || "Creator not recorded"}</p>
                    </div>
                    <Heart size={15} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="liked-empty">
                <Heart size={24} />
                <p>
                  No liked works yet. Add an optional reaction after you’ve
                  experienced a work.
                </p>
              </div>
            )}
          </section>
          <aside className="taste-reflection">
            <span className="reflection-star">
              <Sparkles size={24} />
            </span>
            <div>
              <h3>You’re allowed to change your mind.</h3>
              <p>
                These are glimpses of your taste, not a definition of it. Keep
                noticing.
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
