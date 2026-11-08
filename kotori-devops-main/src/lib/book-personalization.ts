import type { BookMeta } from "@/types/book";

export interface MetadataUpdateInput {
  title?: string;
  author?: string;
}

export function applyBookMetadataUpdate(
  book: BookMeta,
  input: MetadataUpdateInput
): BookMeta {
  const newTitle = input.title !== undefined ? input.title.trim() : book.title;
  const newAuthor = input.author !== undefined ? input.author.trim() : book.author;

  if (!newTitle) {
    throw new Error("Book title cannot be empty");
  }

  return {
    ...book,
    title: newTitle,
    author: newAuthor || "Unknown Author",
  };
}

export function applyToggleFavorite(book: BookMeta): BookMeta {
  return {
    ...book,
    isFavorite: !Boolean(book.isFavorite),
  };
}

export const MAX_NOTE_LENGTH = 2000;

export function applyBookNoteUpdate(book: BookMeta, note: string): BookMeta {
  const cleanNote = note.trim();
  if (cleanNote.length > MAX_NOTE_LENGTH) {
    throw new Error(`Personal note cannot exceed ${MAX_NOTE_LENGTH} characters`);
  }

  return {
    ...book,
    personalNotes: cleanNote,
  };
}