import type { Book } from "../types/openLibrary";

interface BookListProps {
  books: Book[];
}

export function BookList({ books }: BookListProps) {
  return (
    <ul>
      {books.map((book) => (
        <li key={book.key}>
          {book.title} by {book.author_name?.join(", ") ?? "Unknown author"}
          {book.first_publish_year
            ? `, published ${book.first_publish_year}`
            : "Unknown year"}
          .
        </li>
      ))}
    </ul>
  );
}
