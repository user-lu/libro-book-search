import type { BookSearchResponse } from "./openLibrary";

export type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

export function describe(state: RequestState<BookSearchResponse>): string {
  switch (state.status) {
    case "idle":
      return "Choose a book";
    case "loading":
      return "Searching...";
    case "error":
      return state.message;
    case "success":
      return `${state.data.numFound} ${state.data.numFound === 1 ? "book" : "books"} found.`;
  }
}
