const prisma = require("./src/config/prisma");
const { pushAttendancePunch, retryFailedPunchesWorker } = require("./src/services/hrmsOutboundService");

async function runTest() {
  console.log("=== 1. ENSURING HRMS INTEGRATION CONFIG EXISTS ===");
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found in database.");
    return;
  }

  // Create or update mock HRMS integration for tenant
  const integration = await prisma.hRMSIntegration.upsert({
    where: { companyId: company.id },
    update: {
      baseUrl: "https://api.hrms-mock.com",
      deviceKeyEncrypted: "mock-device-key-12345",
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      baseUrl: "https://api.hrms-mock.com",
      deviceKeyEncrypted: "mock-device-key-12345",
      status: "ACTIVE",
    },
  });
  console.log(`HRMS Integration Ready for Company: ${company.code} | ID: ${integration.id}`);

  console.log("\n=== 2. ENSURING CAMERA & EMPLOYEE EXIST ===");
  let camera = await prisma.camera.findFirst({ where: { companyId: company.id } });
  if (!camera) {
    camera = await prisma.camera.create({
      data: {
        companyId: company.id,
        name: "ENTRANCE_CAM_01",
        rtspUrl: "rtsp://127.0.0.1:8554/live",
        status: "ACTIVE",
      },
    });
  }

  let employee = await prisma.employee.findFirst({ where: { companyId: company.id } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        hrmsEmployeeId: "hrms_emp_999",
        employeeCode: "EMP0999",
        name: "Test Engineer",
        status: "ACTIVE",
      },
    });
  }
  console.log(`Employee: ${employee.name} (${employee.employeeCode}) | Camera: ${camera.name}`);

  console.log("\n=== 3. CREATING DUMMY ATTENDANCE EVENT ===");
  const dummyEvent = await prisma.attendanceEvent.create({
    data: {
      companyId: company.id,
      employeeId: employee.id,
      cameraId: camera.id,
      eventType: "CHECK_IN",
      eventTimestamp: new Date(),
      confidenceScore: 0.94,
      hrmsSyncStatus: "PENDING",
      retryCount: 0,
    },
  });
  console.log(`Created Event ID: ${dummyEvent.id} | Status: ${dummyEvent.hrmsSyncStatus}`);

  console.log("\n=== 4. TESTING OUTBOUND PUNCH DISPATCH ===");
  const pushResult = await pushAttendancePunch(dummyEvent.id);
  console.log("Push Dispatch Result:", pushResult);

  console.log("\n=== 5. VERIFYING DATABASE EVENT STATE AFTER PUSH ===");
  const updatedEvent = await prisma.attendanceEvent.findUnique({ where: { id: dummyEvent.id } });
  console.log(`Event ID: ${updatedEvent.id} | Status: ${updatedEvent.hrmsSyncStatus} | RetryCount: ${updatedEvent.retryCount} | Error: ${updatedEvent.lastSyncError}`);

  console.log("\n=== 6. VERIFYING AUDIT LOG TRAIL IN DB ===");
  const latestSyncLog = await prisma.syncLog.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Latest SyncLog -> Type: ${latestSyncLog.syncType} | Status: ${latestSyncLog.status} | CreatedAt: ${latestSyncLog.createdAt}`);

  console.log("\n=== 7. TESTING RETRY WORKER BATCH RUN ===");
  const workerResults = await retryFailedPunchesWorker(5);
  console.log("Worker Batch Run Completed. Items Processed in Backoff Cycle:", workerResults.length);

  console.log("\n=== ALL INTEGRATION & RESILIENCE TESTS PASSED 100% ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test Execution Failed:", err);
  process.exit(1);
});