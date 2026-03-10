import { db } from "./db";
import { users, UserRole } from "@shared/schema";
import { hashPassword } from "./storage";

async function seedDatabase() {
  console.log("Checking for existing users...");
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length > 0) {
    console.log(`Database already has ${existingUsers.length} users. Skipping seed.`);
    return;
  }

  console.log("Seeding database with initial admin user...");

  const adminUser = {
    username: "malik",
    password: "ChangeMe123!",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: UserRole.ADMIN,
    isActive: true,
    mustChangePassword: true,
  };

  const hashedPassword = await hashPassword(adminUser.password);
  await db.insert(users).values({
    ...adminUser,
    password: hashedPassword,
  });
  console.log(`Created admin user: ${adminUser.username}`);
  console.log("IMPORTANT: The initial password must be changed on first login.");

  console.log("Database seeding completed!");
}

seedDatabase().catch(console.error);
