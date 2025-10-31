// create-admin.mjs
import bcrypt from "bcryptjs";
import { openDb, createUser } from "./db.js";

const run = async () => {
  const db = await openDb();

  const username = "admin";
  const password = "admin123"; // change later
  const hash = await bcrypt.hash(password, 10);

  const user = await createUser(username, hash, "admin");
  console.log("✅ Admin created:", user);

  await db.close();
};

run().then(() => process.exit());
