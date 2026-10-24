import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';

// Runs `request(signal)` whenever `deps` change and tracks loading/error state.
// Earlier in-flight requests are aborted so stale responses never overwrite
// fresh ones (and React StrictMode's double effect does not double-fetch).
export function useApi(request, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setErrorStatus(null);

    requestRef
      .current(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err));
        setErrorStatus(err?.response?.status ?? null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, errorStatus, reload, setData };
}
