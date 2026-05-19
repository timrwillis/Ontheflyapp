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

  test("GET /api/me - Get current user profile", async () => {
    const res = await authenticatedApi("/api/me", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(userId);
    expect(data.email).toBeDefined();
    expect(data.name).toBeDefined();
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

  // ===== Onboarding Endpoints =====
  test("POST /api/onboarding/role - Set user role to manager", async () => {
    const res = await authenticatedApi("/api/onboarding/role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "manager" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/role - Set user role to worker", async () => {
    const res = await authenticatedApi("/api/onboarding/role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "worker" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/role - Missing required role field returns 400", async () => {
    const res = await authenticatedApi("/api/onboarding/role", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/onboarding/worker - Create worker profile", async () => {
    const res = await authenticatedApi("/api/onboarding/worker", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Worker",
        phone: "555-0001",
        city: "San Francisco",
        bio: "Experienced worker",
        hasTransportation: true,
        preferredRadiusMiles: 10,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/worker - Missing required phone field returns 400", async () => {
    const res = await authenticatedApi("/api/onboarding/worker", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Worker",
        city: "San Francisco",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/onboarding/worker/roles - Set worker roles", async () => {
    const res = await authenticatedApi("/api/onboarding/worker/roles", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles: [{ role: "cook" }, { role: "server" }],
      }),
    });
    await expectStatus(res, 200, 404);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/worker/roles - Missing required roles field returns 400", async () => {
    const res = await authenticatedApi("/api/onboarding/worker/roles", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/onboarding/worker/availability - Set worker availability", async () => {
    const res = await authenticatedApi("/api/onboarding/worker/availability", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAvailable: true,
        availabilityDays: ["Monday", "Tuesday", "Wednesday"],
        availabilityStart: "08:00",
        availabilityEnd: "17:00",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/manager - Create manager profile", async () => {
    const res = await authenticatedApi("/api/onboarding/manager", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "555-0002",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/manager - Missing required phone field returns 400", async () => {
    const res = await authenticatedApi("/api/onboarding/manager", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/onboarding/business - Create business", async () => {
    const res = await authenticatedApi("/api/onboarding/business", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Restaurant",
        type: "restaurant",
        city: "San Francisco",
        address: "456 Main St",
        phone: "555-0003",
        description: "A test restaurant",
        website: "https://example.com",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/onboarding/business - Missing required address field returns 400", async () => {
    const res = await authenticatedApi("/api/onboarding/business", authToken, {
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

  test("GET /api/onboarding/status - Get onboarding status", async () => {
    const res = await authenticatedApi("/api/onboarding/status", authToken);
    await expectStatus(res, 200, 404);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("POST /api/onboarding/complete - Complete onboarding", async () => {
    const res = await authenticatedApi("/api/onboarding/complete", authToken, {
      method: "POST",
    });
    await expectStatus(res, 200, 404);
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
    expect(Array.isArray(data)).toBe(true);
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

  test("PATCH /api/worker-profiles/me - Update current worker profile (partial)", async () => {
    const res = await authenticatedApi("/api/worker-profiles/me", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio: "Updated bio text",
        is_available: true,
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

  // ===== Worker Invites Endpoints =====
  test("POST /api/worker-invites - Send worker invite", async () => {
    const res = await authenticatedApi("/api/worker-invites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: workerId,
        shiftId: "nonexistent-shift",
        message: "Please apply for this shift",
      }),
    });
    // Endpoint may return 404 if shift doesn't exist, or 200 if it succeeds
    await expectStatus(res, 200, 404);
  });

  test("POST /api/worker-invites - Missing required workerId returns 400", async () => {
    const res = await authenticatedApi("/api/worker-invites", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shiftId: "some-shift",
        message: "Please apply for this shift",
      }),
    });
    await expectStatus(res, 400);
  });

  // ===== Shift Endpoints =====
  test("GET /api/shifts - List all shifts", async () => {
    const res = await authenticatedApi("/api/shifts", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/shifts - Create a shift", async () => {
    const res = await authenticatedApi("/api/shifts", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "chef",
        date: "2026-05-10",
        start_time: "18:00",
        end_time: "22:00",
        hourly_pay: "25.00",
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
        role: "chef",
        date: "2026-05-10",
        start_time: "18:00",
        end_time: "22:00",
        hourly_pay: "25.00",
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
        role: "server",
        date: "2026-05-11",
        start_time: "19:00",
        end_time: "23:00",
        hourly_pay: "20.00",
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

  // ===== Waitlist Endpoints =====
  test("POST /api/waitlist - Join waitlist with all required fields", async () => {
    const res = await api("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John Waitlist",
        phone: "555-9999",
        email: "waitlist@example.com",
        role: "worker",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
  });

  test("POST /api/waitlist - Missing required name field returns 400", async () => {
    const res = await api("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "555-9999",
        email: "waitlist@example.com",
        role: "worker",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/waitlist - Join waitlist as manager", async () => {
    const res = await api("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Manager",
        phone: "555-8888",
        email: "manager@example.com",
        role: "manager",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ===== Delete User Endpoints =====
  test("DELETE /api/users/me - Delete account with role parameter", async () => {
    const res = await api("/api/users/me?role=admin", {
      method: "DELETE",
    });
    await expectStatus(res, 200, 404);
    const data = await res.json();
    if (res.status === 200) {
      expect(data.success).toBeDefined();
      expect(data.message).toBeDefined();
    }
  });

  test("DELETE /api/users/me - Missing required role parameter returns 400", async () => {
    const res = await api("/api/users/me", {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });
});
