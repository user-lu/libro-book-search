# Libro Search

Search Open Library as you type. No API key.

Live app: https://libro-book-search.vercel.app

## What it does

- The box calls `search.json` after typing pauses for 400 ms, and only once the trimmed query is at least 3 characters.
- It shows up to 10 books: title, authors, first-publication year, and a cover when `cover_i` is present.
- The screen is idle, loading, error, or success. “No books found” is a success response whose `docs` array is empty.
- The input has a real label, the page is `header` / `main` / `footer` with `lang="en"`, and the control is a native input, so Tab and typing are enough.

I ran Lighthouse’s Navigation preset on the idle page, the one that says “Type a book name to begin searching.” Performance and Accessibility were both 100. That page had no results, no covers, and no error, so those scores don’t cover them.

## Built with

React 19, TypeScript 6.0.3, and Vite 8, deployed as a static site on Vercel. I picked Vite over Next.js because there is no server code and no secret. `"strict": true` is written in `tsconfig.app.json` even though [TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) turns it on by default: on 6.0.3 I was already getting strict errors before that line existed. Vite’s own `package.json` asks for Node `^20.19.0 || >=22.12.0`.

## Decisions

### Debounce and a 3-character minimum

I debounce the text for 400 ms and I fetch only when the trimmed string is at least 3 characters. I rejected searching on every keystroke. Without that, typing `dune` sent four requests (`d`, `du`, `dun`, `dune`), and Open Library answered the short ones with 422: “Query too short, must be at least 3 characters.”

### `AbortController`

I create one `AbortController` per effect run, abort it in the cleanup, and ignore `AbortError` instead of showing it. I rejected [react.dev’s ignore flag](https://react.dev/learn/synchronizing-with-effects#fetching-data), which drops a stale response but lets the request finish. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) says an `AbortSignal` can only be used once: after it is aborted, any fetch using that same signal is rejected immediately, so a reused controller would cancel every later request.

### `fetchJson<T>`

I use one `fetchJson<T>` that checks `response.ok`, because `fetch` still resolves on 404 and 500, and the caller names the payload type in that one place. I rejected skipping the `ok` check, and I rejected treating `T` as proof of the JSON. `fetchJson<number>` on a search URL typechecked and still returned an object, so `T` is a claim, not a check.

### Optional fields

I require `key` and `title`, and I mark `cover_i`, `author_name`, and `first_publish_year` optional instead of required, because a missing field throws once the code treats it as present and the search docs say the schema can change. 38 of 100 results for “pamphlet” had no cover. In searches for The Divine Comedy, the Aeneid, and the spoons book, none lacked an author or a year.

### One state union

I use a `RequestState<T>` union, and an empty `docs` array stays on success instead of a fifth status. I rejected separate loading, error, and data flags, because they can all be true, while `data` and `message` exist only on their own arms.

A missing case is a compile error only when the function has a declared return type. `describe(): string` failed with “Function lacks ending return statement.” Removing the success case from `SearchResults` still typechecks because that function has no return type.

## What I learned

- The guard `if (debouncedQuery === "" || MIN_NAME_LENGTH)` never let a search run. `MIN_NAME_LENGTH` was `3`, and any non-zero number is truthy, so the `||` was always true. The fix is `if (!isSearchable(debouncedQuery))`, not the `??` fallbacks in `BookList`.
- Cover URLs follow `https://covers.openlibrary.org/b/$key/$value-$size.jpg`. In that pattern `$key` is which identifier you have, and for a `cover_i` the word is `id`. I put the work’s `key` (a different field, same name) in that slot. For Dune that key is `/works/OL893414W`. `coverURL` now uses `id` and the numeric `cover_i`.
- I debounced `isSearchable(query)`, a boolean. The effect then had `true` or `false` and no words to put in `q`. `useDebounce` wraps `query`, and the length check runs on that string.

## What I’d improve

- **Pagination.** The UI shows 10 of `numFound`, so the next step is a page control that changes `page` and `limit`.
- **Validate with Zod.** `fetchJson<T>` accepts any `T`, so a schema at the boundary should catch the docs’ `numFound` / `num_found` split and the shaky `key` formats before they reach `BookList`.
- **Derive idle during render.** When the debounced query is too short, render idle instead of calling `setState` from the effect.
- **Tests.** `useDebounce` wants a timer test, and `SearchResults` wants one render per status, including empty and non-empty success.
- **TanStack Query and Tailwind.** Rebuild with both and compare that version with this effect.

## Run locally

```bash
npm install
npm run dev
```

The dev server prints a local URL. Search needs a network connection, because the page calls Open Library from the browser.

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve that build locally
```

`npm run build` is the Vercel build. There is no server function.

## Credits

Book data and covers come from [Open Library](https://openlibrary.org/) (Internet Archive).

- [Search API](https://openlibrary.org/dev/docs/api/search) — `search.json`, no API key
- [Covers API](https://openlibrary.org/dev/docs/api/covers) — the `/b/$key/$value-$size.jpg` pattern
