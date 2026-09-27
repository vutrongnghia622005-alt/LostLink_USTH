const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const fakePool = { query: async () => ({ rows: [] }), connect: async () => { throw new Error('not configured'); } };
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: fakePool };

const posts = require('../controllers/postController');
const claims = require('../controllers/claimController');
const admin = require('../controllers/adminController');
const UUID = 'd76ae9fd-2731-4e7c-8d18-ac8f382fdc69';

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('malformed questions are rejected and old null entries cannot crash public reads', () => {
    const valid = {
        type: 'found', title: 'Found a laptop', description: 'Black laptop',
        category: 'Thiết bị điện tử', location: 'A21 - USTH',
        eventDate: '2026-09-16T10:00:00+07:00', phone: '0900000000',
        highValue: false, verificationQuestions: [null]
    };
    assert.equal(posts.validatePostInput(valid), 'Invalid verification question.');
    assert.deepEqual(posts.publicQuestions([null, { question: 'Màu gì?', hint: 'bí mật', required: true }]),
        [{ id: 'q1', question: 'Màu gì?', required: true }]);
});

test('public post queries reject hidden and constrain returned rows', async () => {
    const invalid = response();
    await posts.getPosts({ query: { status: 'hidden' } }, invalid);
    assert.equal(invalid.statusCode, 400);

    let sql = '';
    fakePool.query = async (query) => { sql = query; return { rows: [] }; };
    await posts.getPosts({ query: {} }, response());
    assert.match(sql, /p\.status <> 'hidden'/);
    assert.match(sql, /p\.status = \$1/);
    await posts.getPostById({ params: { id: UUID } }, response());
    assert.match(sql, /p\.id = \$1 AND p\.status <> 'hidden'/);
});

test('management code cannot change a hidden post status', async () => {
    let calls = 0;
    fakePool.query = async () => { calls += 1; return { rows: [{ id: UUID, management_code: 'LL-SECRET', status: 'hidden' }] }; };
    const res = response();
    await posts.updateOwnPostStatus({ params: { id: UUID }, body: { status: 'active', managementCode: 'LL-SECRET' }, headers: {}, user: null }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(calls, 1);
});

test('admin list keeps guest posts with a LEFT JOIN', async () => {
    let sql = '';
    fakePool.query = async (query) => { sql = query; return { rows: [] }; };
    await admin.getPosts({}, response());
    assert.match(sql, /LEFT JOIN users/);
    assert.match(sql, /COALESCE\(u\.full_name, p\.reporter_name/);
});

test('claim handoff rolls back when post update fails', async () => {
    const statements = [];
    fakePool.connect = async () => ({
        release() { statements.push('RELEASE'); },
        async query(sql) {
            statements.push(sql);
            if (sql.startsWith('SELECT post_id')) return { rows: [{ post_id: UUID }] };
            if (sql.startsWith('SELECT id, status FROM posts')) return { rows: [{ id: UUID, status: 'active' }] };
            if (sql.startsWith('SELECT * FROM claims')) return { rows: [{ id: UUID, status: 'approved', post_id: UUID }] };
            if (sql.startsWith('UPDATE claims')) return { rows: [{ id: UUID, status: 'completed', post_id: UUID }] };
            if (sql.includes('UPDATE posts')) throw new Error('simulated database failure');
            return { rows: [] };
        }
    });
    const oldError = console.error;
    console.error = () => {};
    try {
        const res = response();
        await claims.updateClaimStatus({ params: { id: UUID }, body: { status: 'completed' } }, res);
        assert.equal(res.statusCode, 500);
        assert.ok(statements.includes('ROLLBACK'));
        assert.ok(!statements.includes('COMMIT'));
    } finally {
        console.error = oldError;
    }
});

test('pending claim cannot skip approval', async () => {
    const statements = [];
    fakePool.connect = async () => ({
        release() {},
        async query(sql) {
            statements.push(sql);
            if (sql.startsWith('SELECT post_id')) return { rows: [{ post_id: UUID }] };
            if (sql.startsWith('SELECT id, status FROM posts')) return { rows: [{ id: UUID, status: 'active' }] };
            if (sql.startsWith('SELECT * FROM claims')) return { rows: [{ id: UUID, status: 'pending', post_id: UUID }] };
            return { rows: [] };
        }
    });
    const res = response();
    await claims.updateClaimStatus({ params: { id: UUID }, body: { status: 'completed' } }, res);
    assert.equal(res.statusCode, 409);
    assert.ok(!statements.some((sql) => sql.startsWith('UPDATE claims')));
});

test('phone format enforces digit count and allowed characters on create and edit', async () => {
    const valid = {
        type: 'lost', title: 'Lost a black laptop', description: 'Black laptop',
        category: 'Thiết bị điện tử', location: 'A21 - USTH',
        eventDate: '2026-09-16T10:00:00+07:00', phone: '0900000000',
        highValue: false, verificationQuestions: []
    };
    for (const phone of ['12345678', '+84 90-000-0000', '123456789012345']) {
        assert.equal(posts.validatePostInput({ ...valid, phone }), null);
    }
    for (const phone of ['abcdefghi', '1234567', '1234567890123456', '09(000)00000', '12345678\n', ' '.repeat(81) + '12345678']) {
        assert.match(posts.validatePostInput({ ...valid, phone }), /8–15/);
    }
    let calls = 0;
    fakePool.query = async () => { calls += 1; return { rows: [{
        ...valid, id: UUID, event_date: valid.eventDate, management_code: 'LL-SECRET',
        high_value: false, verification_questions: [], status: 'active'
    }] }; };
    const createRes = response();
    await posts.createPost({ body: { ...valid, phone: 'letters' } }, createRes);
    assert.equal(createRes.statusCode, 400);
    assert.equal(calls, 0);
    const editRes = response();
    await posts.updatePost({ params: { id: UUID }, headers: {}, body: { phone: 'letters', managementCode: 'LL-SECRET' } }, editRes);
    assert.equal(editRes.statusCode, 400);
    assert.equal(calls, 1);
});

test('public filters and pagination are performed by SQL with a bounded card projection', async () => {
    const queries = [];
    fakePool.query = async (sql, values) => {
        queries.push({ sql, values });
        return sql.includes('COUNT(*)') ? { rows: [{ total: 13 }] } : { rows: [{ id: UUID, title: 'Laptop', category: 'Thiết bị điện tử', location: 'A11' }] };
    };
    const res = response();
    await posts.getPosts({ query: { page: '2', pageSize: '6', search: 'laptop', category: 'Thiết bị điện tử', location: 'A11', time: '7days', highValue: 'true', sort: 'oldest' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual({ total: res.body.total, page: res.body.page, totalPages: res.body.totalPages }, { total: 13, page: 2, totalPages: 3 });
    assert.equal(res.body.posts.length, 1);
    assert.match(queries[0].sql, /plainto_tsquery\('simple'/);
    assert.doesNotMatch(queries[0].sql, /ILIKE/);
    assert.match(queries[0].sql, /created_at >= NOW\(\)/);
    assert.match(queries[0].sql, /p.high_value =/);
    assert.match(queries[1].sql, /LEFT\(p.description, 240\)/);
    assert.doesNotMatch(queries[1].sql, /p\.phone|p\.email|p\.management_code|p\.verification_questions/);
    assert.match(queries[1].sql, /ORDER BY p.created_at ASC, p.id ASC/);
    assert.match(queries[1].sql, /LIMIT \$\d+ OFFSET \$\d+/);
    assert.deepEqual(queries[1].values.slice(-2), [6, 6]);
});

test('public and admin reject invalid pagination before querying the database', async () => {
    fakePool.query = async () => { throw new Error('must not query'); };
    for (const query of [{ page: '0' }, { page: '-1' }, { page: 'abc' }, { pageSize: '101' }, { pageSize: '1.5' }, { page: '9007199254740991', pageSize: '100' }]) {
        for (const controller of [posts, admin]) {
            const res = response();
            await controller.getPosts({ query }, res);
            assert.equal(res.statusCode, 400);
        }
    }
});

test('admin pagination filters all records and clamps a removed last page', async () => {
    const queries = [];
    fakePool.query = async (sql, values) => {
        queries.push({ sql, values });
        return sql.includes('COUNT(*)') ? { rows: [{ total: 20 }] } : { rows: [] };
    };
    const res = response();
    await admin.getPosts({ query: { page: '2', pageSize: '20', type: 'found', status: 'hidden', search: 'LL-12345' } }, res);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.total, 20);
    assert.match(queries[1].sql, /p.type = \$1 AND p.status = \$2/);
    assert.match(queries[1].sql, /p.management_code = UPPER\(\$3\)/);
    assert.deepEqual(queries[1].values, ['found', 'hidden', 'LL-12345', 20, 0]);
});

test('posts save up to five images, keep the first as cover and reject invalid arrays', async () => {
    const imageUrls = Array.from({ length: 5 }, (_, i) => `https://example.com/image-${i}.webp`);
    const valid = {
        type: 'lost', title: 'Lost a black laptop', description: 'Black laptop',
        category: 'Thiết bị điện tử', location: 'A21 - USTH',
        eventDate: '2026-09-16T10:00:00+07:00', phone: '0900000000',
        highValue: false, verificationQuestions: [], imageUrls
    };
    assert.equal(posts.validatePostInput(valid), null);
    for (const images of [[...imageUrls, imageUrls[0]], null, 'image', ['javascript:alert(1)'], [123], ['']]) {
        const res = response();
        await posts.createPost({ body: { ...valid, imageUrls: images } }, res);
        assert.equal(res.statusCode, 400);
    }
    let saved;
    fakePool.query = async (sql, values) => {
        saved = { sql, values };
        return { rows: [{ id: UUID, image_url: values[8], image_urls: values[17] }] };
    };
    const res = response();
    await posts.createPost({ body: valid }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(saved.values[8], imageUrls[0]);
    assert.deepEqual(saved.values[17], imageUrls);
    assert.match(saved.sql, /image_urls/);
    assert.deepEqual(res.body.image_urls, imageUrls);
});

test('editing without new images preserves all images and a new selection replaces them', async () => {
    const imageUrls = ['https://example.com/one.webp', 'https://example.com/two.webp'];
    const current = {
        id: UUID, type: 'lost', title: 'Lost a black laptop', description: 'Black laptop',
        category: 'Thiết bị điện tử', location: 'A11',
        event_date: '2026-09-16T10:00:00+07:00', phone: '0900000000',
        high_value: false, verification_questions: [], status: 'active',
        management_code: 'LL-SECRET', image_url: imageUrls[0], image_urls: imageUrls
    };
    for (const images of [undefined, ['https://example.com/new.webp'], []]) {
        let saved;
        fakePool.query = async (sql, values) => {
            if (sql.startsWith('SELECT')) return { rows: [current] };
            saved = values;
            return { rows: [{ id: UUID }] };
        };
        const body = { managementCode: 'LL-SECRET', title: 'Lost a laptop again' };
        if (images !== undefined) body.imageUrls = images;
        const res = response();
        await posts.updatePost({ params: { id: UUID }, headers: {}, body }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(saved[17], images ?? imageUrls);
        assert.equal(saved[7], (images ?? imageUrls)[0] || null);
    }
});
