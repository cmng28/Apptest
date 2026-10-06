export function registerOfflineApp(): void {
  if (
    !import.meta.env.PROD ||
    !("serviceWorker" in navigator) ||
    location.protocol === "file:" ||
    document.querySelector('meta[name="still-portable"]')
  )
    return;
  const register = () => {
    void navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI), {
        scope: "./",
        updateViaCache: "none",
      })
      .catch(() => {
        // Online use and journal storage still work when offline preparation is unavailable.
      });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
