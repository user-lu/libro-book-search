# Libro Search

A small React app that searches [Open Library](https://openlibrary.org/) as you type. The browser calls a public search API, so this repo has no server code, no secrets, and no API key. The production build is a static Vite site deployed on Vercel.

An interviewer can read **What it does**, **Run it locally**, and **Decisions**. The later sections are the notes for explaining the project out loud.

## What it does

- A search box calls `https://openlibrary.org/search.json`. No key.
- The request waits until typing pauses for **400 ms**, and it does not run until the trimmed query is at least **3 characters**.
- Each search asks for **10** books and only the fields the UI uses: `key`, `title`, `author_name`, `first_publish_year`, `cover_i`.
- A result shows the title, the authors, the first-publication year, and a cover when `cover_i` is present.
- The screen is one of four states: **idle**, **loading**, **error**, or **success**. “No books found” is a success response whose `docs` array is empty.
- Stack: Vite, React 19, TypeScript with `"strict": true` written in `tsconfig.app.json`, deployed on Vercel.
- Accessibility: the input has a real `<label htmlFor="book">`, the page uses `header` / `main` / `footer`, and the only control is a native input, so Tab and typing work without a custom keyboard handler. Loading is `role="status"`. Errors are `role="alert"`.

Lighthouse’s **Navigation** preset is the run that scores a page load. Mobile and desktop are separate runs, so a quoted 100 names both the preset and the device.

## Run it locally

Vite 8 (this repo) needs **Node 20.19+** or **22.12+**.

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and prints a local URL. The search box talks to Open Library from the browser, so you need a network connection.

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve that production build locally
```

`npm run build` is also the Vercel build: typecheck, then a static bundle. There is no server function to configure.

## Walkthrough

From keystroke to list:

1. `App` keeps the input text in `query` (`useState`). Every keystroke updates it immediately, which is what makes the field feel live.
2. `useDebounce(query, 400)` publishes a second value, `debouncedQuery`, 400 ms after `query` stops changing. The effect depends on that value, not on `query`.
3. If the trimmed debounced text is shorter than 3 characters, the effect sets `status: "idle"` and returns. Nothing is fetched.
4. Otherwise the effect creates a **new** `AbortController`, sets `status: "loading"`, and calls `fetchJson`. The cleanup function aborts that controller. The next keystroke (after the debounce) or an unmount cancels the request that effect run started.
5. `fetchJson` checks `response.ok` and returns the JSON as `BookSearchResponse`. A 4xx/5xx becomes `status: "error"` with the technical message stored and a plain sentence shown. An abort is ignored.
6. `SearchResults` switches on `status`. On success it either says “No books found” (`docs.length === 0`) or renders `BookList`.
7. `BookList` prints title, authors, and year, and builds a cover URL only when `cover_i` is a number.

The request looks like this:

```text
https://openlibrary.org/search.json?q=dune&limit=10&fields=key,title,author_name,first_publish_year,cover_i
```

`encodeURIComponent` is applied to the query. `fields` keeps the payload aligned with the `Book` type.

### The same work as event listeners

`useState` replaces a `let query = ""` plus the manual DOM update at the end of an `input` listener. You call `setQuery(e.target.value)` from `onChange`, and React renders again with the new value. The listener is the JSX prop, not `addEventListener`.

`useEffect` in `App` replaces “when the search text changes, start a request, and cancel the previous one when the text changes again.” The function you return from the effect is the teardown. Here that teardown is `controller.abort()`, the same job `removeEventListener` or `clearTimeout` would do in vanilla code.

`useDebounce` is the `setTimeout` / `clearTimeout` pair you would have written inside that input listener. Its effect starts a timer and clears it if `value` changes again before 400 ms.

`StrictMode` in `src/main.tsx` runs effects twice in development. The abort cleanup is why the first of those two requests does not get to call `setState` after it is cancelled.

## Decisions

### Vite + React, instead of Next.js

The app never runs code on a server and never holds a secret. Open Library is called from the browser. Next.js would have added a server/client split before the React parts this project is practicing: state, effects, and rendering a list. Vite bundles the client and serves `index.html`.

### `"strict": true` written in the config

`tsconfig.app.json` sets `"strict": true`. TypeScript 6 turns strict on by default, so a config that omits the flag would still be strict on today’s compiler and loose on an older one. Writing the flag makes the rule visible and independent of the compiler version. The same file also sets `noFallthroughCasesInSwitch`, `noUnusedLocals`, and `noUnusedParameters`.

### Types that match records Open Library actually returns

`Book` requires `key` and `title`. `author_name`, `first_publish_year`, and `cover_i` are optional (`?`).

On a sample of 100 search hits, **38 had no `cover_i`**. Marking that field required would make those rows a lie. The search docs also warn that the schema can change, so a missing author list or year is a normal record, not a bug. `BookList` uses `author_name?.join(", ") ?? "Unknown author"`, prints the year only when it is not `undefined`, and renders a cover only when `cover_i` is present.

The alternative was to mark every field required. The first incomplete record would then be a crash, or a type that pretends the crash cannot happen.

`BookSearchResponse` uses `numFound` (camelCase) because that is the property this client reads. The docs’ own examples disagree with each other on `numFound` / `num_found` and on key formats. See **What I would improve** for checking that at runtime.

### `fetchJson<T>`, with an honest limit

```ts
const response = await fetch(url, { signal });
if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}
const data = await response.json();
return data;
```

`fetch` rejects on network failure. It does **not** reject on HTTP 404 or 500. Those arrive as a normal response with `ok === false`. Without the `response.ok` check, a 422 body would be treated as a successful book list.

The type parameter is the single place a caller names the payload (`fetchJson<BookSearchResponse>(...)`). It is a claim, not a check. `response.json()` is `any`, and returning it as `T` makes TypeScript trust the caller. Calling `fetchJson<number>` on a search URL typechecks and still returns an object at runtime. That experiment is why the README does not say “the response is validated.” Validation belongs at the boundary (Zod is listed below). What `fetchJson` does guarantee is: non-OK HTTP becomes a thrown `Error`, and the abort signal is forwarded.

### `RequestState<T>` as a union

```ts
export type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };
```

It is a `type` because a union cannot be an `interface`.

Separate booleans (`isLoading`, `isError`, `data`) can all be true at once, and `data` is still in scope when you are loading. With the union, `state.data` exists only in the `"success"` arm and `state.message` only in the `"error"` arm. `SearchResults` switches on `status` and reads those fields only in the matching arm.

That switch is not, by itself, an exhaustiveness check. This config does not set `noImplicitReturns`, and there is no `default` that assigns the leftover value to `never`. Forgetting a brand-new status would compile. What fails today is falling through a case (`noFallthroughCasesInSwitch`) or reading a field the active arm does not have. A `never` default would turn a missing status into a compile error; that is still worth adding.

### “No results” is derived

There is no fifth status. `SearchResults` handles `docs.length === 0` inside `"success"`. The empty list and the “no books” sentence cannot disagree, because both come from the same array. A separate `"empty"` status would be a second source of truth to keep in sync with `docs`.

### Debounce plus a minimum length

Open Library answers a query shorter than 3 characters with **422** and a body along the lines of “Query too short, must be at least 3 characters.”

Without a debounce, typing `dune` fired four requests (`d`, `du`, `dun`, `dune`). The short ones failed with that 422. `useDebounce` waits 400 ms, and `isSearchable` refuses to fetch until the trimmed string is at least 3 characters, so those short requests are never sent. The length check reads the debounced string, then `.trim()`.

### `AbortController` in the effect cleanup

The controller is created inside the effect, so each run has its own. The cleanup aborts that run’s controller only. A controller stored outside the effect and reused would abort the new request as well.

The alternative on react.dev is an `ignore` flag: let the old request finish, and skip `setState` if a newer run has started. That avoids a stale UI and still spends the old request. Abort drops the work. In the `catch`, `DOMException` with `name === "AbortError"` returns without `setState`, so a cancelled search is not shown as a failure.

In development, React Strict Mode’s extra effect cycle is the easy way to see this: the first request is aborted and must not surface as an error.

### Friendly error text, technical message kept in state

The error arm stores `error.message`, which looks like `Request failed: 422`. `SearchResults` does not render that string. It renders “Couldn't complete search. Check your connection and try again.” A status code is not something a person can act on. The precise message stays on the state object if you need it while debugging.

### Accessibility choices

| Choice | Why |
| --- | --- |
| `<label htmlFor="book">` with `id="book"` | The name is in the HTML, so a screen reader gets it without a placeholder standing in as a label. |
| `header`, `main`, `footer` | Landmark regions. Lighthouse flagged the page when `<main>` was missing. |
| `role="status"` on “Searching...” | Announces the update without moving focus. |
| `role="alert"` on the error | Announces the failure. |
| `ul` / `li` | The hits are a list, so the semantics are the element, not a styled `div`. |
| `alt=""` on covers | The title is already text in the same item. A repeated title in `alt` would be read twice. The “No Cover” placeholder is `aria-hidden`. |
| Native `<input>` | Keyboard operation is Tab to focus and then typing. There is no custom listbox to implement. |

## Bugs worth owning

These compiled or looked fine and were wrong. The current code is the fix. They are here so the explanation includes what broke.

- **`key` typed as `number`.** Open Library sends strings such as `/works/OL45804W`. The app still compiled, because `fetchJson<T>` does not check the JSON. The first use of that field as a number would throw. `Book.key` is `string`, and that string is the React `key` on each `<li>`.
- **`||` with a constant that was always truthy.** `||` returns the first truthy operand. A non-empty string constant on the left is always truthy, so the real value on the right was never read. Fallbacks in `BookList` now use `??` and `!== undefined`, which only treat `null` or `undefined` as missing. (`||` would also treat `""` and `0` as missing.)
- **Debouncing a boolean.** `useDebounce(isSearchable(query), 400)` only ever produced `true` or `false`, so the effect no longer had the words to put in `q=`. The hook now wraps `query`. The length check happens after the debounce.
- **A `return` outside the `if`.** The idle guard has to `return` *inside* `if (!isSearchable(debouncedQuery))`. A `return` after that `if` ran on every effect, so `load()` never started. In `App` the `return` is inside the guard.
- **Work key passed as the cover URL’s kind.** A cover URL is `https://covers.openlibrary.org/b/id/{cover_i}-S.jpg`. The first segment is the kind (`b` means book), then `id`, then the numeric `cover_i`. Putting the work `key` in the kind slot asked for a cover that cannot exist. `coverURL` hardcodes `b` and `id`, and it is only called when `cover_i` is present. Size is `"S" | "M" | "L"`.

## What I would improve

- **Pagination.** The UI shows 10 of `numFound`, which is often tens of thousands. The response already includes `start` and `numFound`. The missing piece is a page control that changes `start` (or `page`) and `limit`.
- **Validate at the boundary with Zod.** `fetchJson<T>` will accept any `T`. The docs disagree on `numFound` versus `num_found` and on the shape of `key`. A schema parsed once in `fetchJson` would fail there, with a clear error, instead of letting a bad payload into `BookList`.
- **Derive idle during render.** The short-query branch calls `setState({ status: "idle" })` from the effect. Idle can be computed while rendering: if the debounced query is not searchable, render the idle view and do not write state. That removes a state update whose only job is to mirror a value you already have.
- **Tests for `useDebounce` and `SearchResults`.** There is no test runner yet. The debounce hook wants a timer test (value updates after the delay, and a new value cancels the pending one). `SearchResults` wants one render per status, plus the success arm with `docs: []` and with a non-empty list.
- **Rebuild in week 4 with TanStack Query and Tailwind, and compare.** TanStack Query would take over caching, request de-duplication, and retries that this effect does by hand. Tailwind would replace the leftover starter CSS. The useful write-up is a before/after of `App`’s effect, not a claim that the library is free.

## Folder structure

```text
index.html                      mounts #root, sets lang="en" and the title
src/main.tsx                    createRoot and StrictMode
src/App.tsx                     query state, debounce, fetch effect, landmarks
src/components/SearchResults.tsx  the status switch
src/components/BookList.tsx    one <li> per book, cover URL
src/hooks/useDebounce.ts
src/api/fetchJson.ts
src/types/openLibrary.ts        Book and BookSearchResponse
src/types/requestState.ts       RequestState<T>
src/index.css                   styles the page actually imports
vite.config.ts
tsconfig.json                   project references
tsconfig.app.json               "strict": true for src/
```

`src/App.css` and `public/icons.svg` are still from the Vite starter. `App` does not import `App.css`. They are not on the search path.

## Credits

Book data and covers come from [Open Library](https://openlibrary.org/) (Internet Archive).

- [Search API](https://openlibrary.org/dev/docs/api/search) — `search.json`, no API key
- [Covers API](https://openlibrary.org/dev/docs/api/covers) — `covers.openlibrary.org`
