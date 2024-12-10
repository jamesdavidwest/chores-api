const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        this.dbPath = path.join(__dirname, '../../../data/chores.db');
        this.db = new sqlite3.Database(this.dbPath);
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    async beginTransaction() {
        return this.run('BEGIN TRANSACTION');
    }

    async commit() {
        return this.run('COMMIT');
    }

    async rollback() {
        return this.run('ROLLBACK');
    }

    async withTransaction(callback) {
        try {
            await this.beginTransaction();
            const result = await callback();
            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }
}

module.exports = DatabaseService;