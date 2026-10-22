import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export interface ServerTerm {
  dictName: string;
  expression: string;
  reading: string;
  meanings: string[];
  tags?: string[];
  rules?: string;
  score?: number;
  jlpt?: string;
  deinflectionRules?: string[];
  example?: { japanese: string; translation: string };
  forms?: string[];
  frequency?: { dictName: string; rank: number; display: string }[];
  pitchPosition?: number;
}

export interface ServerKanji {
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
  jlpt?: string;
}

class DictionaryDatabase {
  private db: DatabaseSync | null = null;
  private stmtGetTerm: StatementSync | null = null;
  private stmtGetReading: StatementSync | null = null;
  private stmtGetKanji: StatementSync | null = null;
  private stmtHasTerm: StatementSync | null = null;
  private stmtStats: StatementSync | null = null;
  private isInitialized = false;

  private findDbPath(): string | null {
    const candidatePaths = [
      path.join(process.cwd(), "src", "data", "dict-v1.db"),
      path.join(process.cwd(), ".next", "dict-v1.db"),
      path.join(process.cwd(), "dict-v1.db"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  public init(): boolean {
    if (this.isInitialized && this.db) return true;

    try {
      const dbPath = this.findDbPath();
      if (!dbPath) return false;

      this.db = new DatabaseSync(dbPath, { readOnly: true });
      this.stmtGetTerm = this.db.prepare("SELECT data FROM terms WHERE expression = ?");
      this.stmtGetReading = this.db.prepare("SELECT expressions FROM readings WHERE reading = ?");
      this.stmtGetKanji = this.db.prepare("SELECT data FROM kanji WHERE kanji = ?");
      this.stmtHasTerm = this.db.prepare("SELECT 1 FROM terms WHERE expression = ? LIMIT 1");
      this.stmtStats = this.db.prepare(
        "SELECT (SELECT count(*) FROM terms) as totalTerms, (SELECT count(*) FROM kanji) as totalKanji"
      );

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn("[DictionaryDatabase] Could not open SQLite database:", err);
      this.db = null;
      this.isInitialized = false;
      return false;
    }
  }

  public isReady(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    return this.isInitialized && this.db !== null;
  }

  public getTerms(expression: string): ServerTerm[] | null {
    if (!this.isReady() || !this.stmtGetTerm) return null;
    try {
      const row = this.stmtGetTerm.get(expression) as { data: string } | undefined;
      if (!row || !row.data) return null;
      return JSON.parse(row.data) as ServerTerm[];
    } catch {
      return null;
    }
  }

  public hasTerm(expression: string): boolean {
    if (!this.isReady() || !this.stmtHasTerm) return false;
    try {
      const row = this.stmtHasTerm.get(expression);
      return Boolean(row);
    } catch {
      return false;
    }
  }

  public getTermsByReading(reading: string): ServerTerm[] | null {
    if (!this.isReady() || !this.stmtGetReading || !this.stmtGetTerm) return null;
    try {
      const row = this.stmtGetReading.get(reading) as { expressions: string } | undefined;
      if (!row || !row.expressions) return null;
      const expressions = JSON.parse(row.expressions) as string[];

      const results: ServerTerm[] = [];
      for (const expr of expressions) {
        const terms = this.getTerms(expr);
        if (terms) {
          for (const t of terms) {
            if (t.reading === reading) {
              results.push(t);
            }
          }
        }
      }
      return results.length > 0 ? results : null;
    } catch {
      return null;
    }
  }

  public getKanji(char: string): ServerKanji | null {
    if (!this.isReady() || !this.stmtGetKanji) return null;
    try {
      const row = this.stmtGetKanji.get(char) as { data: string } | undefined;
      if (!row || !row.data) return null;
      return JSON.parse(row.data) as ServerKanji;
    } catch {
      return null;
    }
  }

  public getStats(): { isReady: boolean; totalTerms: number; totalKanji: number } {
    if (!this.isReady() || !this.stmtStats) {
      return { isReady: false, totalTerms: 0, totalKanji: 0 };
    }
    try {
      const stats = this.stmtStats.get() as { totalTerms: number; totalKanji: number } | undefined;
      return {
        isReady: true,
        totalTerms: stats?.totalTerms || 0,
        totalKanji: stats?.totalKanji || 0,
      };
    } catch {
      return { isReady: true, totalTerms: 0, totalKanji: 0 };
    }
  }
}

export const dictionaryDb = new DictionaryDatabase();
