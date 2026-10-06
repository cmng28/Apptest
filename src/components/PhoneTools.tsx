import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, FileUp, Smartphone } from "lucide-react";
import { createBackup, MAX_BACKUP_BYTES, parseBackup } from "../lib/backup";
import { todayDate } from "../lib/journal";
import type { Journal } from "../lib/journal";
import "./phone-tools.css";

function RestoreDialog({
  backup,
  current,
  onRestore,
  onCancel,
}: {
  backup: Journal;
  current: Journal;
  onRestore: (journal: Journal) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const invokingControl = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (invokingControl?.isConnected)
        invokingControl.focus({ preventScroll: true });
      else document.getElementById("main")?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="delete-dialog"
      ref={ref}
      aria-labelledby="restore-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="restore-title">Restore this backup?</h2>
      <p>
        This will replace your current {current.works.length}{" "}
        {current.works.length === 1 ? "work" : "works"} and{" "}
        {current.entries.length}{" "}
        {current.entries.length === 1 ? "entry" : "entries"} with the backup’s{" "}
        {backup.works.length} {backup.works.length === 1 ? "work" : "works"} and{" "}
        {backup.entries.length}{" "}
        {backup.entries.length === 1 ? "entry" : "entries"}.
      </p>
      <p>
        Save a backup of your current journal first if you want to keep it.
        Sample entries are separate.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button button-quiet" autoFocus onClick={onCancel}>
          Keep current journal
        </button>
        <button
          className="button button-danger"
          onClick={() => {
            try {
              onRestore(backup);
              onCancel();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "The backup could not be restored.",
              );
            }
          }}
        >
          Replace with backup
        </button>
      </div>
    </dialog>
  );
}

export function PhoneTools({
  journal,
  disabled,
  onRestore,
}: {
  journal: Journal;
  disabled: boolean;
  onRestore: (journal: Journal) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Journal | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [portable] = useState(() =>
    Boolean(document.querySelector('meta[name="still-portable"]')),
  );
  const [standalone] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  useEffect(() => {
    let live = true;
    if (
      !portable &&
      "serviceWorker" in navigator &&
      location.protocol !== "file:"
    ) {
      void navigator.serviceWorker.ready.then((registration) => {
        const appRoot = new URL("./", document.baseURI).href;
        if (live && registration.scope === appRoot) setOfflineReady(true);
      });
    }
    return () => {
      live = false;
    };
  }, [portable]);

  const exportBackup = async () => {
    setError("");
    setMessage("");
    setSharing(true);
    try {
      const file = new File(
        [createBackup(journal)],
        `Still-backup-${todayDate()}.json`,
        { type: "application/json" },
      );
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: "Still journal backup" });
        setMessage(
          "Backup shared. Keep a copy in Files so you can restore it later.",
        );
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setMessage(
          "Backup download started. Keep the file so you can restore it later.",
        );
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError")
        setMessage("Backup sharing cancelled. Your journal is unchanged.");
      else
        setError(
          cause instanceof Error && cause.message.startsWith("Your journal")
            ? cause.message
            : "Your backup could not be saved. Your journal is unchanged. Please try again.",
        );
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="phone-tools">
      <section className="phone-tool" aria-labelledby="iphone-title">
        <span className="phone-tool-icon">
          <Smartphone size={22} />
        </span>
        <p className="eyebrow">TAKE YOUR JOURNAL WITH YOU</p>
        <h2 id="iphone-title">
          {standalone ? "At home on your phone." : "Still on your iPhone."}
        </h2>
        {portable ? (
          <p>
            This desktop copy has everything included. To move your journal to
            the iPhone version, save a backup here and restore it from the
            hosted app on your phone.
          </p>
        ) : standalone ? (
          <p>Open Still from this icon whenever you want to leave a note.</p>
        ) : (
          <>
            <p>
              Open the hosted app in Safari. Tap Share, choose Add to Home
              Screen, then tap Add. On some iPhones, Share is inside the menu.
            </p>
            <p>
              Add the icon first, then make a test entry from your Home Screen
              and reopen it to check that it stays saved.
            </p>
          </>
        )}
        <p
          className={`offline-status ${offlineReady ? "ready" : ""}`}
          role="status"
        >
          {portable
            ? "Ready to use on this computer."
            : offlineReady
              ? "Ready for offline use on this browser."
              : "Open online and wait for “Ready for offline use” before going offline."}
        </p>
        <p className="phone-footnote">
          Safari and the Home Screen app may keep separate journals. Use a
          backup to move your entries.
        </p>
      </section>
      <section className="phone-tool" aria-labelledby="backup-title">
        <span className="phone-tool-icon">
          <ArrowDownToLine size={22} />
        </span>
        <p className="eyebrow">KEEP A COPY OF WHAT MATTERS</p>
        <h2 id="backup-title">Your journal, backed up.</h2>
        <p>
          Save your personal entries as a file. On iPhone, choose Save to Files
          if the share sheet opens. Sample data is never included.
        </p>
        <p className="backup-count">
          {journal.works.length} {journal.works.length === 1 ? "work" : "works"}{" "}
          · {journal.entries.length}{" "}
          {journal.entries.length === 1 ? "entry" : "entries"} in your personal
          journal
        </p>
        <div className="backup-actions">
          <button
            className="button button-primary"
            disabled={disabled || sharing}
            onClick={() => void exportBackup()}
          >
            <ArrowDownToLine size={16} />
            {sharing ? "Saving backup…" : "Save backup"}
          </button>
          <button
            className="button button-quiet"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp size={16} />
            Restore backup
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Choose a Still backup"
          disabled={disabled}
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            setError("");
            setMessage("");
            try {
              if (file.size > MAX_BACKUP_BYTES)
                throw new Error("Choose a Still backup smaller than 10 MB.");
              setPending(parseBackup(await file.text()));
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not read this backup. Your journal has not changed.",
              );
            }
          }}
        />
        {disabled && (
          <p className="error-message">
            Your existing journal needs recovery before backups can be saved or
            restored.
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="backup-message" role="status">
            {message}
          </p>
        )}
        <p className="phone-footnote">
          Keep the file somewhere safe. Backups are not encrypted. Restoring
          asks before replacing your current journal.
        </p>
      </section>
      {pending && (
        <RestoreDialog
          backup={pending}
          current={journal}
          onRestore={onRestore}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
