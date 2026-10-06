import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  CirclePlus,
  Film,
  Heart,
  Library,
  Menu,
  Music2,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  addEntry,
  deleteEntry,
  deleteWork,
  editEntry,
  EMPTY_JOURNAL,
  readJournal,
  writeJournal,
} from "./lib/journal";
import type {
  EntryInput,
  Journal,
  JournalEntry,
  Work,
  WorkType,
} from "./lib/journal";
import { LibraryScreen } from "./components/LibraryScreen";
import { TasteScreen } from "./components/TasteScreen";
import { WorkCover } from "./components/WorkCover";
import { SAMPLE_JOURNAL } from "./lib/samples";
import "./components/management.css";

const TYPES: { value: WorkType; label: string; icon: typeof Palette }[] = [
  { value: "artwork", label: "Art", icon: Palette },
  { value: "album", label: "Albums", icon: Music2 },
  { value: "song", label: "Songs", icon: Music2 },
  { value: "movie", label: "Movies", icon: Film },
];
const typeLabel = (type: WorkType) =>
  ({ artwork: "Artwork", song: "Song", album: "Album", movie: "Movie" })[type];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const reactionLabel = (reaction: JournalEntry["reaction"]) =>
  reaction
    ? { liked: "Liked", mixed: "Mixed feelings", not_for_me: "Not for me" }[
        reaction
      ]
    : "No reaction recorded";
const go = (path: string) => {
  window.location.hash = path;
};

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function EntryForm({
  onSave,
  initialWork,
  initialEntry,
  existingWork = false,
  cancelPath = "/library",
}: {
  onSave: (input: EntryInput) => void;
  initialWork?: Work;
  initialEntry?: JournalEntry;
  existingWork?: boolean;
  cancelPath?: string;
}) {
  const [type, setType] = useState<WorkType>(initialWork?.type ?? "artwork");
  const [status, setStatus] = useState<"saved" | "experienced">(
    initialEntry?.status ?? "experienced",
  );
  const [reaction, setReaction] = useState<JournalEntry["reaction"]>(
    initialEntry?.reaction ?? null,
  );
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      onSave({
        type,
        title: String(values.get("title") ?? ""),
        creator: String(values.get("creator") ?? ""),
        year: String(values.get("year") ?? ""),
        date: String(values.get("date") ?? ""),
        status,
        reaction:
          status === "experienced"
            ? (String(
                values.get("reaction") || "",
              ) as JournalEntry["reaction"]) || null
            : null,
        toExplore: values.has("explore"),
        tags: String(values.get("tags") ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: String(values.get("notes") ?? ""),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your entry. Please try again.",
      );
    }
  };
  return (
    <div className="form-layout">
      <form onSubmit={submit} ref={formRef} className="entry-form">
        <section className="form-section">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>The work</h2>
              <p>A few details to remember it by.</p>
            </div>
          </div>
          {existingWork && (
            <p className="form-help">
              Adding a new dated entry to this work. Its details stay the same.
            </p>
          )}
          {initialEntry && (
            <p className="form-help">
              Work details apply to all entries for this item. Your reaction,
              date, tags, and notes below change only this entry.
            </p>
          )}
          <fieldset className="type-fieldset" disabled={existingWork}>
            <legend>What are you adding?</legend>
            <div className="type-options">
              {TYPES.map(({ value, icon: Icon }) => (
                <label
                  key={value}
                  className={
                    type === value ? "type-option selected" : "type-option"
                  }
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                  />
                  <Icon size={20} />
                  {typeLabel(value)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Title <span className="required">required</span>
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={initialWork?.title}
              readOnly={existingWork}
              placeholder={
                type === "movie"
                  ? "The name of the film"
                  : "The name of the work"
              }
            />
          </label>
          <div className="field-row">
            <label className="field">
              Creator <span>optional</span>
              <input
                name="creator"
                maxLength={200}
                defaultValue={initialWork?.creator}
                readOnly={existingWork}
                placeholder={
                  type === "movie"
                    ? "Director or filmmaker"
                    : "Artist or musician"
                }
              />
            </label>
            <label className="field year-field">
              Year <span>optional</span>
              <input
                name="year"
                inputMode="numeric"
                pattern="[12][0-9]{3}"
                maxLength={4}
                defaultValue={initialWork?.year}
                readOnly={existingWork}
                placeholder="e.g. 2024"
              />
            </label>
          </div>
        </section>
        <section className="form-section">
          <div className="section-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Your entry</h2>
              <p>How it met you, at this moment.</p>
            </div>
          </div>
          <label className="field date-field">
            Entry date
            <input
              type="date"
              name="date"
              required
              defaultValue={initialEntry?.date ?? today()}
            />
          </label>
          <fieldset className="status-fieldset">
            <legend>Where are you with this work?</legend>
            <div className="status-options">
              <label className={status === "saved" ? "selected" : ""}>
                <input
                  type="radio"
                  name="status"
                  checked={status === "saved"}
                  onChange={() => {
                    setStatus("saved");
                    setReaction(null);
                  }}
                />
                <Bookmark size={18} />
                <span>
                  Saved for later<small>I haven't experienced it yet</small>
                </span>
              </label>
              <label className={status === "experienced" ? "selected" : ""}>
                <input
                  type="radio"
                  name="status"
                  checked={status === "experienced"}
                  onChange={() => setStatus("experienced")}
                />
                <Check size={18} />
                <span>
                  Experienced<small>I've seen, heard, or watched it</small>
                </span>
              </label>
            </div>
          </fieldset>
          {status === "experienced" && (
            <label className="field">
              Reaction <span>optional</span>
              <div className="select-wrap">
                <select
                  name="reaction"
                  value={reaction ?? ""}
                  onChange={(event) =>
                    setReaction(
                      (event.target.value as JournalEntry["reaction"]) || null,
                    )
                  }
                >
                  <option value="">No reaction</option>
                  <option value="liked">Liked</option>
                  <option value="mixed">Mixed feelings</option>
                  <option value="not_for_me">Not for me</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
          )}
          <label className="explore-check">
            <input
              type="checkbox"
              name="explore"
              defaultChecked={initialEntry?.toExplore}
            />
            <Bookmark size={18} />
            <span>
              Keep on my explore list
              <small>A little reminder to return to it.</small>
            </span>
          </label>
          <label className="field">
            Tags <span>optional</span>
            <input
              name="tags"
              maxLength={500}
              defaultValue={initialEntry?.tags.join(", ")}
              placeholder="dreamlike, slow mornings, color…"
            />
            <small>Separate tags with commas.</small>
          </label>
          <label className="field">
            Notes <span>optional</span>
            <textarea
              name="notes"
              rows={5}
              maxLength={10000}
              defaultValue={initialEntry?.notes}
              placeholder="What caught your attention? What stayed with you?"
            />
          </label>
        </section>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <a className="button button-quiet" href={`#${cancelPath}`}>
            Cancel
          </a>
          <button className="button button-primary" type="submit">
            {initialEntry ? "Save changes" : "Save entry"}{" "}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
      <aside className="form-aside">
        <div className="note-drawing">
          <Sparkles size={32} />
          <span className="draw-loop" />
        </div>
        <h3>
          There’s no right
          <br />
          way to feel.
        </h3>
        <p>
          A fleeting thought counts. So does a feeling you can’t quite name.
          Leave yourself a little room to change.
        </p>
        <span className="aside-line" />
        <p className="aside-foot">
          Just for you.
          <br />
          Saved in this browser.
        </p>
      </aside>
    </div>
  );
}

function DeleteDialog({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const invokingControl = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (invokingControl?.isConnected) invokingControl.focus({ preventScroll: true });
      else document.getElementById('main')?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="delete-dialog"
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="delete-title">{title}</h2>
      <p>{description}</p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button button-quiet" autoFocus onClick={onCancel}>
          Keep it
        </button>
        <button
          className="button button-danger"
          onClick={() => {
            try {
              onConfirm();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not delete this entry.",
              );
            }
          }}
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}

export default function App() {
  const [loadError, setLoadError] = useState("");
  const [journal, setJournal] = useState<Journal>(() => {
    try {
      return readJournal();
    } catch (cause) {
      queueMicrotask(() =>
        setLoadError(
          cause instanceof Error
            ? cause.message
            : "Your journal could not be loaded.",
        ),
      );
      return { ...EMPTY_JOURNAL, works: [], entries: [] };
    }
  });
  const [route, setRoute] = useState(
    window.location.hash.slice(1) || "/library",
  );
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    entryId?: string;
    workId: string;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const handle = () => {
      setRoute(window.location.hash.slice(1) || "/library");
      setMobileMenu(false);
      setNotice("");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);
  const isSample = route.startsWith("/sample/");
  const isEdit = route.startsWith("/edit/");
  const fromSample = route.startsWith("/add-from-sample/");
  const screen =
    route.startsWith("/add") || isEdit
      ? "add"
      : route.startsWith("/item/") || isSample
        ? "item"
        : route === "/taste"
          ? "taste"
          : "library";
  const targetId = route.split("/")[2];
  const source = isSample ? SAMPLE_JOURNAL : journal;
  const work = source.works.find((item) => item.id === targetId);
  const editingEntry = isEdit
    ? journal.entries.find((entry) => entry.id === targetId)
    : undefined;
  const initialWork = isEdit
    ? journal.works.find((item) => item.id === editingEntry?.workId)
    : fromSample
      ? SAMPLE_JOURNAL.works.find((item) => item.id === targetId)
      : journal.works.find((item) => item.id === targetId);
  const existingWork = !isEdit && !fromSample && Boolean(initialWork);
  const commit = (next: Journal) => {
    if (loadError)
      throw new Error(
        "Your existing journal needs recovery before changes can be saved.",
      );
    const stored = readJournal();
    if (JSON.stringify(stored) !== JSON.stringify(journal))
      throw new Error(
        "Your journal changed in another tab. Copy your draft and reload before saving, so those changes are kept.",
      );
    writeJournal(next);
    setJournal(next);
  };
  const save = (input: EntryInput) => {
    let savedWorkId: string;
    if (editingEntry) {
      commit(editEntry(journal, editingEntry.id, input));
      savedWorkId = editingEntry.workId;
    } else {
      const result = addEntry(
        journal,
        input,
        existingWork ? initialWork?.id : undefined,
      );
      commit(result.journal);
      savedWorkId = result.work.id;
    }
    setSampleMode(false);
    go(`/item/${savedWorkId}`);
    window.setTimeout(
      () =>
        setNotice(
          editingEntry
            ? "Changes saved to your journal."
            : "Entry saved to your journal.",
        ),
      0,
    );
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    const next = pendingDelete.entryId
      ? deleteEntry(journal, pendingDelete.entryId)
      : deleteWork(journal, pendingDelete.workId);
    commit(next);
    setPendingDelete(null);
    if (!next.works.some((item) => item.id === pendingDelete.workId))
      go("/library");
    window.setTimeout(() => setNotice("Removed from your journal."), 0);
  };
  const navigation = [
    { route: "/library", label: "My Library", icon: Library },
    { route: "/add", label: "Add an Entry", icon: CirclePlus },
    { route: "/taste", label: "My Taste", icon: Heart },
  ];
  const activeNav = (path: string) =>
    screen ===
      (path === "/add" ? "add" : path === "/taste" ? "taste" : "library") ||
    (screen === "item" && path === "/library");
  const entries = work
    ? source.entries
        .filter((entry) => entry.workId === work.id)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt) ||
            b.id.localeCompare(a.id),
        )
    : [];
  const missingFormTarget =
    screen === "add" &&
    (isEdit || fromSample || Boolean(targetId)) &&
    (!initialWork || (isEdit && !editingEntry));
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <a className="brand" href="#/library" aria-label="Still home">
          <Mark />
          <span>
            still<span className="brand-period">.</span>
          </span>
        </a>
        <p className="brand-tagline">A PERSONAL TASTE JOURNAL</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ route: path, label, icon: Icon }) => (
            <a
              key={path}
              href={`#${path}`}
              aria-current={activeNav(path) ? "page" : undefined}
              className={`nav-link ${activeNav(path) ? "active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === "/library" && (
                <span className="nav-count">{journal.works.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <span className="quote-mark">“</span>
            <p>
              Pay attention.
              <br />
              Be astonished.
              <br />
              Tell about it.
            </p>
            <span>— MARY OLIVER</span>
          </div>
          <div className="privacy-note">
            <span className="privacy-dot" />
            <div>
              Your own little corner
              <small>Private · Stored in this browser</small>
            </div>
          </div>
        </div>
      </aside>
      <header className="mobile-header">
        <a className="brand" href="#/library">
          <Mark small />
          <span>still.</span>
        </a>
        <button
          className="icon-button"
          aria-label={mobileMenu ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        <div className="topbar">
          <div className="breadcrumb">
            YOUR SPACE <span>/</span>{" "}
            {screen === "add"
              ? isEdit
                ? "EDIT AN ENTRY"
                : "A NEW ENTRY"
              : screen === "item"
                ? "ITEM DETAILS"
                : screen === "taste"
                  ? "MY TASTE"
                  : "MY LIBRARY"}
          </div>
          <span className="topbar-note">
            <span className="privacy-dot" /> A little more you, with every entry
          </span>
        </div>
        {loadError && (
          <div className="error-message" role="alert">
            {loadError} Your original data has been kept. Saving is disabled to
            protect it.
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            <Check size={17} />
            {notice}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {screen === "library" && (
          <LibraryScreen
            journal={journal}
            sampleMode={sampleMode}
            onSampleModeChange={setSampleMode}
          />
        )}
        {screen === "add" &&
          (missingFormTarget ? (
            <div className="empty-state">
              <h1>That entry isn’t here.</h1>
              <p>Return to your library to add a new one.</p>
              <a href="#/library" className="button button-primary">
                Back to My Library
              </a>
            </div>
          ) : (
            <>
              <a
                className="back-link"
                href={
                  initialWork && !fromSample
                    ? `#/item/${initialWork.id}`
                    : "#/library"
                }
              >
                <ArrowLeft size={16} />
                {initialWork && !fromSample
                  ? "Back to item details"
                  : "Back to your library"}
              </a>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {isEdit
                      ? "LEAVE A LITTLE ROOM TO CHANGE"
                      : "MAKE A LITTLE NOTE"}
                  </p>
                  <h1>
                    {isEdit
                      ? "Edit your entry"
                      : existingWork
                        ? "A new moment"
                        : "What stayed with you"}
                    <span className="heading-dot">
                      {isEdit || existingWork ? "." : "?"}
                    </span>
                  </h1>
                  <p>
                    {existingWork
                      ? "The same work, a different day. Keep the earlier feeling, too."
                      : "Record the work. Leave a thought. Come back when you feel differently."}
                  </p>
                </div>
              </div>
              {fromSample && (
                <div className="sample-copy-note">
                  Only the sample work’s details are copied. Your reaction,
                  notes, and date are your own.
                </div>
              )}
              <EntryForm
                key={route}
                onSave={save}
                initialWork={initialWork}
                initialEntry={editingEntry}
                existingWork={existingWork}
                cancelPath={
                  initialWork && !fromSample
                    ? `/item/${initialWork.id}`
                    : "/library"
                }
              />
            </>
          ))}
        {screen === "item" &&
          (work ? (
            <>
              <a
                className="back-link"
                href="#/library"
                onClick={() => {
                  if (isSample) setSampleMode(true);
                }}
              >
                <ArrowLeft size={16} /> Back to your library
              </a>
              {isSample && (
                <div className="sample-detail-banner">
                  <Sparkles size={17} />
                  <div>
                    <strong>Sample data</strong>
                    <p>
                      A fictional journal entry for inspiration. The cover is an
                      illustration, not the original work.
                    </p>
                  </div>
                  <a
                    className="button button-quiet"
                    href={`#/add-from-sample/${work.id}`}
                  >
                    Add to my journal <Plus size={15} />
                  </a>
                </div>
              )}
              <div className="detail-layout">
                <div>
                  <WorkCover work={work} large />
                  <p className="cover-caption">
                    Illustrative cover · Work details entered manually
                  </p>
                </div>
                <div className="detail-content">
                  <p className="eyebrow">
                    {typeLabel(work.type)}
                    {work.year && ` · ${work.year}`}
                  </p>
                  <h1>{work.title}</h1>
                  <p className="detail-creator">
                    {work.creator || "Creator not recorded"}
                  </p>
                  {!isSample && (
                    <div className="detail-actions">
                      <a
                        className="button button-quiet"
                        href={`#/add/${work.id}`}
                      >
                        <Plus size={16} /> Add another entry
                      </a>
                      <button
                        className="text-button delete-item"
                        onClick={() => setPendingDelete({ workId: work.id })}
                      >
                        <Trash2 size={14} /> Delete item
                      </button>
                    </div>
                  )}
                  <div className="detail-rule" />
                  <h2 className="journal-heading">
                    {isSample ? "Sample journal" : "Your journal"}{" "}
                    <span>
                      {entries.length}{" "}
                      {entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </h2>
                  {entries.map((entry) => (
                    <article className="journal-entry" key={entry.id}>
                      <p className="entry-date">{dateLabel(entry.date)}</p>
                      <div className="entry-badges">
                        <span className="status-pill">
                          {entry.status === "experienced" ? (
                            <Check size={13} />
                          ) : (
                            <Bookmark size={13} />
                          )}
                          {entry.status === "experienced"
                            ? "Experienced"
                            : "Saved for later"}
                        </span>
                        {entry.status === "experienced" && (
                          <span
                            className={`status-pill ${entry.reaction === "liked" ? "liked" : ""}`}
                          >
                            <Heart size={13} />
                            {reactionLabel(entry.reaction)}
                          </span>
                        )}
                        {entry.toExplore && (
                          <span className="status-pill explore">
                            To explore
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="entry-notes">{entry.notes}</p>
                      )}
                      <div className="entry-tags">
                        {entry.tags.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                      {!isSample && (
                        <div className="entry-actions">
                          <a
                            className="text-button"
                            href={`#/edit/${entry.id}`}
                          >
                            <Pencil size={13} /> Edit entry
                          </a>
                          <button
                            className="text-button"
                            onClick={() =>
                              setPendingDelete({
                                workId: work.id,
                                entryId: entry.id,
                              })
                            }
                          >
                            <Trash2 size={13} /> Delete entry
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h1>We couldn’t find that item.</h1>
              <p>It may have been removed from your journal.</p>
              <a className="button button-primary" href="#/library">
                Back to My Library
              </a>
            </div>
          ))}
        {screen === "taste" && (
          <TasteScreen
            journal={journal}
            sampleMode={sampleMode}
            onSampleModeChange={setSampleMode}
          />
        )}
        <footer>
          <span>
            <Mark small /> Little notes. Lasting impressions.
          </span>
          <span>Made for your eyes only.</span>
        </footer>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navigation.map(({ route: path, label, icon: Icon }) => (
          <a
            key={path}
            href={`#${path}`}
            aria-current={activeNav(path) ? "page" : undefined}
            className={activeNav(path) ? "active" : ""}
          >
            <Icon size={20} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      {pendingDelete && (
        <DeleteDialog
          title={
            pendingDelete.entryId ? "Delete this entry?" : "Delete this item?"
          }
          description={
            pendingDelete.entryId
              ? `This dated entry for “${journal.works.find((item) => item.id === pendingDelete.workId)?.title}” will be removed. Other entries stay. If it is the last entry, the item is also removed. This cannot be undone.`
              : `“${journal.works.find((item) => item.id === pendingDelete.workId)?.title}” and all its journal entries will be removed. This cannot be undone.`
          }
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
