-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "Post_body_trgm_idx" ON "Post" USING GIN ("body" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Profile_displayName_trgm_idx" ON "Profile" USING GIN ("displayName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_username_trgm_idx" ON "User" USING GIN ("username" gin_trgm_ops);
