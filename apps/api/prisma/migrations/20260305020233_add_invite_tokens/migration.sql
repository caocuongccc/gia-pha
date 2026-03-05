-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL DEFAULT 'VIEWER',
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
