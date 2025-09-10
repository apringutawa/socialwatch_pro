
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Post' AND column_name='text_search'
  ) THEN
    ALTER TABLE "Post" ADD COLUMN text_search tsvector
      GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text,''))) STORED;
    CREATE INDEX IF NOT EXISTS post_text_search_idx ON "Post" USING GIN (text_search);
  END IF;
END$$;
