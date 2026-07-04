import { db } from "./db";
import { users, organizations, subscriptions, UserRole } from "@shared/schema";
import { hashPassword } from "./storage";

async function seedDatabase() {
  console.log("Checking for existing users...");
  const existingUsers = await db.select().from(users);

  if (existingUsers.length > 0) {
    console.log(`Database already has ${existingUsers.length} users. Skipping seed.`);
    return;
  }

  console.log("Seeding database with initial organization and owner user...");

  // Every user must belong to an organization — an org-less admin would
  // bypass the multi-tenant boundary check (checkOrgBoundary in routes.ts).
  const [organization] = await db.insert(organizations).values({
    name: "Default Organization",
    slug: "default",
  }).returning();

  await db.insert(subscriptions).values({
    organizationId: organization.id,
    plan: "free",
    status: "active",
    seatCount: 1,
    maxSeats: 3,
    currentPeriodStart: new Date(),
  });

  const ownerUser = {
    username: "malik",
    password: "ChangeMe123!",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: UserRole.OWNER,
    organizationId: organization.id,
    isActive: true,
    mustChangePassword: true,
  };

  const hashedPassword = await hashPassword(ownerUser.password);
  await db.insert(users).values({
    ...ownerUser,
    password: hashedPassword,
  });
  console.log(`Created owner user: ${ownerUser.username} in organization "${organization.name}"`);
  console.log("IMPORTANT: The initial password must be changed on first login.");

  console.log("Database seeding completed!");
}

seedDatabase().catch(console.error);
