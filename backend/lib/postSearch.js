const SEARCH_VECTOR = "to_tsvector('simple', coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p.location, '') || ' ' || coalesce(p.category, '') || ' ' || coalesce(p.location_detail, ''))";

function pagination(query = {}) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
        !Number.isSafeInteger((page - 1) * pageSize)) return null;
    return { page, pageSize };
}

async function pagedPosts(pool, { fields, where, values, order, paging }) {
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM posts p ${where}`, values);
    const total = count.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / paging.pageSize));
    const page = Math.min(paging.page, totalPages);
    const result = await pool.query(`SELECT ${fields} FROM posts p LEFT JOIN users u ON u.id = p.user_id
        ${where} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, paging.pageSize, (page - 1) * paging.pageSize]);
    return { posts: result.rows, total, page, pageSize: paging.pageSize, totalPages };
}

module.exports = { SEARCH_VECTOR, pagination, pagedPosts };
