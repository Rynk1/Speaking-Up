import { db } from './db';

export class BaseRepository<T extends { id: string }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  public findById(id: string): T | null {
    const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as any;
    return row || null;
  }

  public findAll(whereClause: string = '', params: any[] = [], orderBy: string = 'created_at DESC', limit?: number): T[] {
    let sql = `SELECT * FROM ${this.tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    return db.prepare(sql).all(...params) as T[];
  }

  public deleteById(id: string): boolean {
    const res = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  public count(whereClause: string = '', params: any[] = []): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    const res = db.prepare(sql).get(...params) as any;
    return res ? res.count : 0;
  }
}
