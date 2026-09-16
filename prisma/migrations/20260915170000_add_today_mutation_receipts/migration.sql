-- CreateTable
CREATE TABLE "TodayMutationReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodayMutationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodayMutationReceipt_userId_requestId_key" ON "TodayMutationReceipt"("userId", "requestId");

-- CreateIndex
CREATE INDEX "TodayMutationReceipt_userId_idx" ON "TodayMutationReceipt"("userId");

-- CreateIndex
CREATE INDEX "TodayMutationReceipt_taskId_idx" ON "TodayMutationReceipt"("taskId");

-- AddForeignKey
ALTER TABLE "TodayMutationReceipt" ADD CONSTRAINT "TodayMutationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodayMutationReceipt" ADD CONSTRAINT "TodayMutationReceipt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
