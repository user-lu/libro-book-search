import type { Book } from "../types/openLibrary";

interface BookListProps {
  books: Book[];
}

type CoverSize = "S" | "M" | "L";

function coverURL(coverId: number, size: CoverSize): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function BookList({ books }: BookListProps) {
  return (
    <ul className="book-list">
      {books.map((book) => (
        <li key={book.key} className="book-card">
          {book.cover_i !== undefined ? (
            <img
              className="book-art"
              src={coverURL(book.cover_i, "S")}
              alt=""
              width={48}
              height={72}
              loading="lazy"
            />
          ) : (
            <div className="book-art book-art--empty" aria-hidden="true">
              No Cover
            </div>
          )}
          <div className="book-text">
            <p className="book-title">{book.title}</p>
            <p className="book-meta">
              by {book.author_name?.join(", ") ?? "Unknown author"}
              {book.first_publish_year !== undefined
                ? `, published ${book.first_publish_year}`
                : ""}
              .
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
