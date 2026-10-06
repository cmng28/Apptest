import type { Work } from "../lib/journal";

const typeLabel = (type: Work["type"]) =>
  ({ artwork: "Artwork", song: "Song", album: "Album", movie: "Movie" })[type];

/** Local, decorative illustrations. These are not reproductions or official covers. */
export function WorkCover({
  work,
  large = false,
}: {
  work: Work;
  large?: boolean;
}) {
  const index =
    work.title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  return (
    <div
      className={`cover cover-${work.type} palette-${index} ${large ? "cover-large" : ""}`}
      aria-hidden="true"
    >
      {work.type === "artwork" ? (
        <div className="art-composition">
          <span className="art-circle" />
          <span className="art-arch" />
          <span className="art-line" />
          <span className="art-small-circle" />
        </div>
      ) : work.type === "album" || work.type === "song" ? (
        <div className="album-composition">
          <span className="record">
            <i />
          </span>
          <span className="album-type">
            {work.title}
            <small>{work.creator || "A listening note"}</small>
          </span>
        </div>
      ) : (
        <div className="film-composition">
          <span className="film-sun" />
          <span className="film-hills" />
          <span className="film-title">
            {work.title}
            <small>A FILM TO REMEMBER</small>
          </span>
        </div>
      )}
      <span className="cover-type">{typeLabel(work.type)}</span>
    </div>
  );
}
