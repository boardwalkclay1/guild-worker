import { MongoClient } from "mongodb";

let cachedClient = null;

async function getDB(env) {
  if (!cachedClient) {
    cachedClient = new MongoClient(env.MONGO_URI);
    await cachedClient.connect();
  }
  return cachedClient.db(env.MONGO_DB);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // -----------------------------
    // TEST ROUTE
    // -----------------------------
    if (path === "/test") {
      return new Response("Guild Worker is alive.", { status: 200 });
    }

    // -----------------------------
    // CREATE USER
    // POST /create-user
    // body: { username, password, unlockUntil }
    // -----------------------------
    if (path === "/create-user" && request.method === "POST") {
      const body = await request.json();
      const db = await getDB(env);

      await db.collection("users").insertOne({
        username: body.username,
        password: body.password,
        unlockUntil: body.unlockUntil
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -----------------------------
    // LOGIN CHECK
    // POST /login
    // body: { username, password }
    // -----------------------------
    if (path === "/login" && request.method === "POST") {
      const body = await request.json();
      const db = await getDB(env);

      const user = await db.collection("users").findOne({
        username: body.username
      });

      if (!user) {
        return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      if (user.password !== body.password) {
        return new Response(JSON.stringify({ ok: false, error: "wrong_pass" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        unlockUntil: user.unlockUntil
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -----------------------------
    // VERIFY UNLOCK
    // GET /verify?username=...
    // -----------------------------
    if (path === "/verify" && request.method === "GET") {
      const username = url.searchParams.get("username");
      const db = await getDB(env);

      const user = await db.collection("users").findOne({ username });

      if (!user) {
        return new Response(JSON.stringify({ ok: false }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        unlockUntil: user.unlockUntil
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -----------------------------
    // DEFAULT 404
    // -----------------------------
    return new Response("Not Found", { status: 404 });
  }
};
