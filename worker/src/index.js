/**
 * Cloudflare Worker for DigitalMe Data Ingestion
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Expose secure POST endpoint at /api/ingest/hilo
    if (request.method !== "POST" || url.pathname !== "/api/ingest/hilo") {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Authentication check using Bearer Token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Bearer Token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.substring(7);
    if (token !== env.AUTH_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid Token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // Parse payload
      const payload = await request.json();
      if (!Array.isArray(payload)) {
        return new Response(JSON.stringify({ error: "Invalid payload: Expected an array of blood pressure metrics" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log(`Processing ingestion request with ${payload.length} blood pressure records`);

      // Prepare statements for batch execution
      const insertStmt = env.DB.prepare(
        "INSERT INTO hilo_bp (id, date, timestamp, systolic, diastolic, pulse) VALUES (?, ?, ?, ?, ?, ?)"
      );

      const statements = [];
      for (const record of payload) {
        // Validate record properties
        const { timestamp, systolic, diastolic, pulse } = record;
        if (!timestamp || typeof systolic !== "number" || typeof diastolic !== "number" || typeof pulse !== "number") {
          return new Response(JSON.stringify({ error: "Invalid record: missing properties or incorrect types" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Normalize timestamp to ISO 8601 and extract date YYYY-MM-DD
        let parsedDate;
        try {
          const dt = new Date(timestamp);
          if (isNaN(dt.getTime())) throw new Error();
          parsedDate = dt.toISOString().split("T")[0]; // returns YYYY-MM-DD
        } catch (err) {
          return new Response(JSON.stringify({ error: `Invalid timestamp format: ${timestamp}` }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Unique ID generation (UUID)
        const recordId = crypto.randomUUID();

        // Bind parameters and push to batch statements
        statements.push(insertStmt.bind(recordId, parsedDate, timestamp, systolic, diastolic, pulse));
      }

      // Execute SQL Batch insert into D1
      if (statements.length > 0) {
        await env.DB.batch(statements);
        console.log(`Successfully batch inserted ${statements.length} records into D1`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully ingested ${statements.length} records`,
        count: statements.length
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("Ingestion Failure:", error.message, error.stack);
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
