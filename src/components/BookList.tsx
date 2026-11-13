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
    <ul>
      {books.map((book) => (
        <li key={book.key}>
          {book.title} by {book.author_name?.join(", ") ?? "Unknown author"}
          {book.first_publish_year
            ? `, published ${book.first_publish_year}`
            : ", Unknown"}
          .
          {book.cover_i !== undefined ? (
            <img
              src={coverURL(book.cover_i, "S")}
              alt=""
              width={48}
              height={72}
              style={{ objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div aria-hidden="true">No Cover</div>
          )}
        </li>
      ))}
    </ul>
  );
}
