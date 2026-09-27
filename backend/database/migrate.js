const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function migrate(database = pool) {
    const client = await database.connect();
    try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '15s'");
        await client.query("SET LOCAL statement_timeout = '120s'");
        // Serialize deploys so two backend instances cannot add the same column at once.
        await client.query('SELECT pg_advisory_xact_lock(20260927)');
        await client.query(fs.readFileSync(path.join(__dirname, 'upgrade-2026-09-27.sql'), 'utf8'));
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = migrate;
