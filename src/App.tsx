import { useEffect, useState } from "react";
import { fetchJson } from "./api/fetchJson";
import { describe, type RequestState } from "./types/requestState";
import type { BookSearchResponse } from "./types/openLibrary";
import { useDebounce } from "./hooks/useDebounce";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<RequestState<BookSearchResponse>>({
    status: "idle",
  });
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (debouncedQuery === "") {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();

    async function load() {
      setState({ status: "loading" });
      try {
        const data = await fetchJson<BookSearchResponse>(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(debouncedQuery)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i`,
          controller.signal,
        );
        setState({ status: "success", data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    load();
    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <>
      <label htmlFor="book">Book</label>
      <input
        id="book"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p>{describe(state)}</p>
    </>
  );
}

export default App;
