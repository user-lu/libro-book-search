export interface Book {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

export interface BookSearchResponse {
  numFound: number;
  start: number;
  docs: Book[];
}
