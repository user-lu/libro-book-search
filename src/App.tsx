import { useEffect, useState } from "react";
import { fetchJson } from "./api/fetchJson";
import type { RequestState } from "./types/requestState";
import type { BookSearchResponse } from "./types/openLibrary";
import { useDebounce } from "./hooks/useDebounce";
import { SearchResults } from "./components/SearchResults";

const MIN_QUERY_LENGTH = 3;

function isSearchable(text: string): boolean {
  return text.trim().length >= MIN_QUERY_LENGTH;
}

function App() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<RequestState<BookSearchResponse>>({
    status: "idle",
  });
  const debouncedQuery = useDebounce(query, 400).trim();

  useEffect(() => {
    // Guard
    if (!isSearchable(debouncedQuery)) {
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
      <header>
        <h1>Libro Search</h1>
      </header>
      <main>
        <label htmlFor="book-search">Search for Books</label>
        <input
          id="book-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchResults state={state} />
      </main>
      <footer>
        Data from <a href="https://openlibrary.org/">Open Library</a>
      </footer>
    </>
  );
}

export default App;
