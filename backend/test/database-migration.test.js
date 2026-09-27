const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const databasePath = require.resolve('../config/database');
const database = { query: null, connect: null };
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: database };
const migrate = require('../database/migrate');
const posts = require('../controllers/postController');
const admin = require('../controllers/adminController');

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('upgrade the old PostgreSQL schema twice, preserve old posts and read/write five images', async () => {
    const db = new PGlite();
    try {
        // Reproduce the deployed schema before image_urls and the new search indexes.
        const oldSchema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8')
            .split('-- Must match the expression')[0]
            .replace(/^CREATE EXTENSION IF NOT EXISTS pgcrypto;\s*/m, '')
            .replace(/^\s*image_urls TEXT\[\][^\r\n]*\r?\n/m, '');
        await db.exec(oldSchema);
        const id = 'd76ae9fd-2731-4e7c-8d18-ac8f382fdc69';
        await db.query(`INSERT INTO posts (id, type, title, description, category, location, event_date, phone, image_url, management_code)
            VALUES ($1, 'lost', 'Laptop màu đen', 'Laptop cũ', 'Thiết bị điện tử', 'A11', NOW(), '0900000000',
                'https://example.com/old.webp', 'LL-OLD')`, [id]);
        await assert.rejects(db.query('SELECT image_urls FROM posts'), { code: '42703' });

        database.query = async (sql, values) => values ? db.query(sql, values) : (await db.exec(sql))[0];
        database.connect = async () => ({ query: database.query, release() {} });
        await migrate(database);
        await migrate(database);

        const indexes = await db.query("SELECT indexname FROM pg_indexes WHERE tablename = 'posts'");
        assert.ok(indexes.rows.some((row) => row.indexname === 'posts_search_idx'));
        assert.ok(indexes.rows.some((row) => row.indexname === 'posts_status_created_id_idx'));
        const oldPost = response();
        await posts.getPostById({ params: { id } }, oldPost);
        assert.equal(oldPost.statusCode, 200);
        assert.equal(oldPost.body.image_url, 'https://example.com/old.webp');
        assert.deepEqual(oldPost.body.image_urls, []);

        const imageUrls = Array.from({ length: 5 }, (_, i) => `https://example.com/new-${i}.webp`);
        const created = response();
        await posts.createPost({ body: {
            type: 'lost', title: 'Laptop mới màu đen', description: 'Laptop mới',
            category: 'Thiết bị điện tử', location: 'A11', phone: '0900000000',
            eventDate: '2026-09-27T09:00:00+07:00', imageUrls
        } }, created);
        assert.equal(created.statusCode, 201);
        assert.deepEqual(created.body.image_urls, imageUrls);
        assert.equal(created.body.image_url, imageUrls[0]);

        const detail = response();
        await posts.getPostById({ params: { id: created.body.id } }, detail);
        assert.equal(detail.statusCode, 200);
        assert.deepEqual(detail.body.image_urls, imageUrls);

        const listing = response();
        await posts.getPosts({ query: { search: 'Laptop', pageSize: '1', page: '2' } }, listing);
        assert.equal(listing.statusCode, 200);
        assert.equal(listing.body.total, 2);
        assert.equal(listing.body.posts.length, 1);
        const adminList = response();
        await admin.getPosts({ query: { search: 'Laptop', pageSize: '1' } }, adminList);
        assert.equal(adminList.statusCode, 200);
        assert.equal(adminList.body.total, 2);

        const edited = response();
        await posts.updatePost({ params: { id: created.body.id }, headers: {}, body: {
            title: 'Laptop đã cập nhật', managementCode: created.body.management_code
        } }, edited);
        assert.equal(edited.statusCode, 200);
        assert.deepEqual(edited.body.image_urls, imageUrls);
        const unused = await db.query(`SELECT public_url FROM uploaded_images i
            WHERE NOT EXISTS (SELECT 1 FROM posts p WHERE p.image_url = i.public_url OR i.public_url = ANY(p.image_urls))`);
        assert.deepEqual(unused.rows, []);
    } finally {
        await db.close();
    }
});

test('failed schema updates roll back and release the connection', async () => {
    const calls = [];
    const failure = new Error('insufficient table permissions');
    await assert.rejects(migrate({ connect: async () => ({
        async query(sql) {
            calls.push(sql);
            if (sql.includes('ALTER TABLE')) throw failure;
        },
        release() { calls.push('RELEASE'); }
    }) }), failure);
    assert.ok(calls.includes('ROLLBACK'));
    assert.ok(!calls.includes('COMMIT'));
    assert.equal(calls.at(-1), 'RELEASE');
});
