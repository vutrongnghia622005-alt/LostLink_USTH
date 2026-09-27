
-- Must match the expression in backend/lib/postSearch.js.
CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' ||
        coalesce(location, '') || ' ' || coalesce(category, '') || ' ' || coalesce(location_detail, ''))
);
CREATE INDEX IF NOT EXISTS posts_status_created_id_idx ON posts(status, created_at DESC, id DESC);

-- Keep image_url as the cover image for existing list views.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(image_urls) <= 5);
