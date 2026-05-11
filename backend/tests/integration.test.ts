import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let businessId: string;
  let workerId: string;
  let shiftId: string;
  let applicationId: string;
  let secondShiftId: string;
  let secondApplicationId: string;

  // ===== Setup and User Endpoints =====
  test("Sign up test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    userId = user.id;
    expect(authToken).toBeDefined();
    expect(userId).toBeDefined();
  });

  test("GET /api/users/me - Get current user profile", async () => {
    const res = await authenticatedApi("/api/users/me", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(userId);
    expect(data.email).toBeDefined();
  });

  test("POST /api/users/switch-role - Switch to manager", async () => {
    const res = await authenticatedApi("/api/users/switch-role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "manager" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.role).toBe("manager");
  });

  test("POST /api/users/switch-role - Switch to worker", async () => {
    const res = await authenticatedApi("/api/users/switch-role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "worker" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.role).toBe("worker");
  });

  test("POST /api/users/switch-role - Switch to admin", async () => {
    const res = await authenticatedApi("/api/users/switch-role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.role).toBe("admin");
  });

  test("POST /api/users/switch-role - Missing required role field returns 400", async () => {
    const res = await authenticatedApi("/api/users/switch-role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // ===== Business Endpoints =====
  test("GET /api/businesses - List all businesses", async () => {
    const res = await authenticatedApi("/api/businesses", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.businesses).toBeDefined();
    expect(Array.isArray(data.businesses)).toBe(true);
  });

  test("POST /api/businesses - Create a business", async () => {
    const res = await authenticatedApi("/api/businesses", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Restaurant",
        type: "restaurant",
        city: "San Francisco",
        address: "123 Main St",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    businessId = data.id;
    expect(businessId).toBeDefined();
    expect(data.name).toBe("Test Restaurant");
  });

  test("POST /api/businesses - Missing required address field returns 400", async () => {
    const res = await authenticatedApi("/api/businesses", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Business",
        type: "bar",
        city: "San Francisco",
      }),
    });
    await expectStatus(res, 400);
  });

  test("GET /api/businesses/{id} - Get business by ID", async () => {
    const res = await authenticatedApi(`/api/businesses/${businessId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(businessId);
  });

  test("GET /api/businesses/{id} - Non-existent business returns 404", async () => {
    const res = await authenticatedApi("/api/businesses/nonexistent-id", authToken);
    await expectStatus(res, 404);
  });

  // ===== Worker Profile Endpoints =====
  test("GET /api/worker-profiles - List all worker profiles", async () => {
    const res = await authenticatedApi("/api/worker-profiles", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.workers).toBeDefined();
    expect(Array.isArray(data.workers)).toBe(true);
  });

  test("POST /api/worker-profiles - Create a worker profile", async () => {
    const res = await authenticatedApi("/api/worker-profiles", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John Doe",
        phone: "555-1234",
        city: "San Francisco",
        roles: ["chef"],
        yearsExperience: 5,
        certifications: ["Food Handler"],
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    workerId = data.id;
    expect(workerId).toBeDefined();
  });

  test("POST /api/worker-profiles - Missing required phone field returns 400", async () => {
    const res = await authenticatedApi("/api/worker-profiles", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Doe",
        city: "San Francisco",
      }),
    });
    await expectStatus(res, 400);
  });

  test("GET /api/worker-profiles/{id} - Get worker profile by ID", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}`, authToken);
    await expectStatus(res, 200);
  });

  test("GET /api/worker-profiles/{id} - Non-existent worker returns 404", async () => {
    const res = await authenticatedApi("/api/worker-profiles/nonexistent-id", authToken);
    await expectStatus(res, 404);
  });

  test("GET /api/worker-profiles/me - Get current worker profile", async () => {
    const res = await authenticatedApi("/api/worker-profiles/me", authToken);
    await expectStatus(res, 200);
  });

  test("PUT /api/worker-profiles/me - Update current worker profile", async () => {
    const res = await authenticatedApi("/api/worker-profiles/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Doe",
        bio: "Senior chef",
      }),
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/worker-profiles/{id}/availability - Update worker availability to true", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}/availability`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: true }),
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/worker-profiles/{id}/availability - Update worker availability to false", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}/availability`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: false }),
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/worker-profiles/{id}/availability - Missing required field returns 400", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}/availability`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("PATCH /api/worker-profiles/{id}/availability - Non-existent worker returns 404", async () => {
    const res = await authenticatedApi("/api/worker-profiles/nonexistent-id/availability", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: true }),
    });
    await expectStatus(res, 404);
  });

  test("PATCH /api/worker-profiles/{id}/verify - Verify worker", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}/verify`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/worker-profiles/{id}/verify - Non-existent worker returns 404", async () => {
    const res = await authenticatedApi("/api/worker-profiles/nonexistent-id/verify", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  test("PATCH /api/worker-profiles/{id}/suspend - Suspend worker", async () => {
    const res = await authenticatedApi(`/api/worker-profiles/${workerId}/suspend`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/worker-profiles/{id}/suspend - Non-existent worker returns 404", async () => {
    const res = await authenticatedApi("/api/worker-profiles/nonexistent-id/suspend", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  // ===== Shift Endpoints =====
  test("GET /api/shifts - List all shifts", async () => {
    const res = await authenticatedApi("/api/shifts", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.shifts).toBeDefined();
  });

  test("POST /api/shifts - Create a shift", async () => {
    const res = await authenticatedApi("/api/shifts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleNeeded: "chef",
        date: "2026-05-10",
        startTime: "18:00",
        endTime: "22:00",
        hourlyPay: "25.00",
        location: "San Francisco",
        urgency: "tomorrow",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    shiftId = data.id;
    expect(shiftId).toBeDefined();
  });

  test("POST /api/shifts - Missing required urgency field returns 400", async () => {
    const res = await authenticatedApi("/api/shifts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleNeeded: "chef",
        date: "2026-05-10",
        startTime: "18:00",
        endTime: "22:00",
        hourlyPay: "25.00",
        location: "San Francisco",
      }),
    });
    await expectStatus(res, 400);
  });

  test("GET /api/shifts/{id} - Get shift by ID", async () => {
    const res = await authenticatedApi(`/api/shifts/${shiftId}`, authToken);
    await expectStatus(res, 200);
  });

  test("GET /api/shifts/{id} - Non-existent shift returns 404", async () => {
    const res = await authenticatedApi("/api/shifts/nonexistent-id", authToken);
    await expectStatus(res, 404);
  });

  test("PATCH /api/shifts/{id} - Update shift status", async () => {
    const res = await authenticatedApi(`/api/shifts/${shiftId}`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/shifts/{id} - Missing required status field returns 400", async () => {
    const res = await authenticatedApi(`/api/shifts/${shiftId}`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("PATCH /api/shifts/{id} - Non-existent shift returns 404", async () => {
    const res = await authenticatedApi("/api/shifts/nonexistent-id", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "filled" }),
    });
    await expectStatus(res, 404);
  });

  test("POST /api/shifts - Create a second shift for rejection test", async () => {
    const res = await authenticatedApi("/api/shifts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleNeeded: "server",
        date: "2026-05-11",
        startTime: "19:00",
        endTime: "23:00",
        hourlyPay: "20.00",
        location: "Oakland",
        urgency: "this_week",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    secondShiftId = data.id;
    expect(secondShiftId).toBeDefined();
  });

  test("POST /api/shifts/{id}/apply - Apply for shift", async () => {
    const res = await authenticatedApi(`/api/shifts/${shiftId}/apply`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 201);
    const data = await res.json();
    applicationId = data.id;
  });

  test("POST /api/shifts/{id}/apply - Apply for second shift", async () => {
    const res = await authenticatedApi(`/api/shifts/${secondShiftId}/apply`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 201);
    const data = await res.json();
    secondApplicationId = data.id;
    expect(secondApplicationId).toBeDefined();
  });

  test("POST /api/shifts/{id}/apply - Non-existent shift returns 404", async () => {
    const res = await authenticatedApi("/api/shifts/nonexistent-id/apply", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("GET /api/shifts/{id}/applications - Get shift applications", async () => {
    const res = await authenticatedApi(`/api/shifts/${shiftId}/applications`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.applications).toBeDefined();
    expect(Array.isArray(data.applications)).toBe(true);
  });

  test("GET /api/shifts/{id}/applications - Non-existent shift returns 404", async () => {
    const res = await authenticatedApi("/api/shifts/nonexistent-id/applications", authToken);
    await expectStatus(res, 404);
  });

  // ===== Application Endpoints =====
  test("GET /api/my-applications - Get user applications", async () => {
    const res = await authenticatedApi("/api/my-applications", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.applications).toBeDefined();
    expect(Array.isArray(data.applications)).toBe(true);
  });

  test("PATCH /api/applications/{id}/confirm - Confirm application", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}/confirm`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/applications/{id}/confirm - Non-existent application returns 404", async () => {
    const res = await authenticatedApi("/api/applications/nonexistent-id/confirm", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  test("PATCH /api/applications/{id}/reject - Reject application", async () => {
    const res = await authenticatedApi(`/api/applications/${secondApplicationId}/reject`, authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 200);
  });

  test("PATCH /api/applications/{id}/reject - Non-existent application returns 404", async () => {
    const res = await authenticatedApi("/api/applications/nonexistent-id/reject", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  // ===== Rating Endpoints =====
  test("POST /api/ratings - Create a rating", async () => {
    const res = await authenticatedApi("/api/ratings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: shiftId,
        worker_id: workerId,
        score: 5,
        comment: "Excellent work!",
      }),
    });
    await expectStatus(res, 201);
  });

  test("POST /api/ratings - Missing required worker_id returns 400", async () => {
    const res = await authenticatedApi("/api/ratings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shift_id: shiftId,
        score: 5,
      }),
    });
    await expectStatus(res, 400);
  });

  test("GET /api/ratings/worker/{worker_id} - Get worker ratings", async () => {
    const res = await authenticatedApi(`/api/ratings/worker/${workerId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.ratings).toBeDefined();
    expect(Array.isArray(data.ratings)).toBe(true);
  });

  // ===== Notification Endpoints =====
  test("GET /api/notifications - Get all notifications", async () => {
    const res = await authenticatedApi("/api/notifications", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.notifications).toBeDefined();
    expect(Array.isArray(data.notifications)).toBe(true);
  });

  test("PATCH /api/notifications/{id}/read - Mark notification as read", async () => {
    const notificationsRes = await authenticatedApi("/api/notifications", authToken);
    await expectStatus(notificationsRes, 200);
    const notificationsData = await notificationsRes.json();

    if (notificationsData.notifications && notificationsData.notifications.length > 0) {
      const notificationId = notificationsData.notifications[0].id;
      const res = await authenticatedApi(`/api/notifications/${notificationId}/read`, authToken, {
        method: "PATCH",
      });
      await expectStatus(res, 200);
    }
  });

  test("PATCH /api/notifications/{id}/read - Non-existent notification returns 404", async () => {
    const res = await authenticatedApi("/api/notifications/nonexistent-id/read", authToken, {
      method: "PATCH",
    });
    await expectStatus(res, 404);
  });

  // ===== Admin Endpoints =====
  test("GET /api/admin/stats - Get admin statistics", async () => {
    const res = await authenticatedApi("/api/admin/stats", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.total_users).toBeDefined();
    expect(typeof data.total_users).toBe("number");
    expect(data.total_workers).toBeDefined();
    expect(data.total_businesses).toBeDefined();
    expect(data.total_shifts).toBeDefined();
    expect(data.open_shifts).toBeDefined();
    expect(data.filled_shifts).toBeDefined();
  });

  // ===== Marketplace Endpoints =====
  test("GET /api/marketplace/stats - Get public marketplace statistics", async () => {
    const res = await api("/api/marketplace/stats");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.workers_available).toBeDefined();
    expect(typeof data.workers_available).toBe("number");
    expect(data.restaurants_hiring).toBeDefined();
    expect(typeof data.restaurants_hiring).toBe("number");
    expect(data.shifts_filled_this_week).toBeDefined();
    expect(typeof data.shifts_filled_this_week).toBe("number");
  });
});
