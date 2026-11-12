import type { BookSearchResponse } from "../types/openLibrary";
import type { RequestState } from "../types/requestState";
import { BookList } from "./BookList";

interface SearchResultsProps {
  state: RequestState<BookSearchResponse>;
}

export function SearchResults({ state }: SearchResultsProps) {
  switch (state.status) {
    case "idle":
      return <p>Type a book name to begin searching</p>;
    case "loading":
      return <p role="status">Searching...</p>;
    case "error":
      return (
        <p role="alert">
          Couldn't complete search. Check your connection and try again.
        </p>
      );
    case "success":
      return state.data.docs.length === 0 ? (
        <p>No books found.</p>
      ) : (
        <>
          <p>
            Showing {state.data.docs.length} of{" "}
            {state.data.numFound.toLocaleString()}
            {state.data.numFound === 1 ? " book" : " books"} found.
          </p>
          <BookList books={state.data.docs} />
        </>
      );
  }
}
