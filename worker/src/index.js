/**
 * Cloudflare Worker for DigitalMe Data Ingestion
 */

export default {
  // HTTP Endpoint Handler
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
  },

  // Cron Trigger Handler
  async scheduled(event, env, ctx) {
    console.log(`Cron trigger fired at ${new Date().toISOString()}`);
    ctx.waitUntil(handleGarminDailyIngestion(env));
  }
};

/**
 * Main ingestion handler for fetching Garmin health metrics and inserting them into D1
 */
async function handleGarminDailyIngestion(env) {
  // 1. Calculate target date (yesterday, format YYYY-MM-DD)
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - 1);
  const targetDate = dateObj.toISOString().split("T")[0];
  console.log(`Target date for Garmin Connect ingestion: ${targetDate}`);

  try {
    // 2. Fetch session from KV
    let sessionStr = await env.GARMIN_AUTH_KV.get("session");
    if (!sessionStr) {
      console.error("Garmin mobile session not found in KV (key: 'session'). Ingestion skipped.");
      return;
    }

    let sessionObj = JSON.parse(sessionStr);

    let sleepData = null;
    let hrvData = null;

    // 3. Fetch sleep summaries
    try {
      const sleepRes = await fetchWithRetry(
        `https://connect.garmin.com/user-service/user/sleep/daily/${targetDate}`,
        env,
        sessionObj
      );
      sleepData = sleepRes.data;
      sessionObj = sleepRes.session; // Keep updated session pointer
    } catch (err) {
      console.error(`Failed to fetch sleep data for ${targetDate}: ${err.message}`);
    }

    // 4. Fetch HRV summaries
    try {
      const hrvRes = await fetchWithRetry(
        `https://connect.garmin.com/hrv-service/hrv/daily/${targetDate}`,
        env,
        sessionObj
      );
      hrvData = hrvRes.data;
      sessionObj = hrvRes.session; // Keep updated session pointer
    } catch (err) {
      console.error(`Failed to fetch HRV data for ${targetDate}: ${err.message}`);
    }

    // If both failed, terminate ingestion
    if (!sleepData && !hrvData) {
      console.warn("No telemetry data retrieved. Skipping D1 database write.");
      return;
    }

    // 5. Parse sleep metrics
    const sleepDTO = (sleepData && sleepData.dailySleepDTO) ? sleepData.dailySleepDTO : {};
    const sleepScore = typeof sleepDTO.sleepScore === "number" ? sleepDTO.sleepScore : null;
    const deepSleepSeconds = typeof sleepDTO.deepSleepSeconds === "number" ? sleepDTO.deepSleepSeconds : null;
    const lightSleepSeconds = typeof sleepDTO.lightSleepSeconds === "number" ? sleepDTO.lightSleepSeconds : null;
    const remSleepSeconds = typeof sleepDTO.remSleepSeconds === "number" ? sleepDTO.remSleepSeconds : null;
    const awakeSeconds = typeof sleepDTO.awakeSeconds === "number" ? sleepDTO.awakeSeconds : null;

    // 6. Parse HRV metrics
    const hrvDTO = (hrvData && hrvData.hrvSummary) ? hrvData.hrvSummary : {};
    const lastNightHrvAvg = typeof hrvDTO.lastNightAvg === "number" ? hrvDTO.lastNightAvg : 
                           (typeof hrvDTO.lastNightHrv === "number" ? hrvDTO.lastNightHrv : null);
    const weeklyHrvAvg = typeof hrvDTO.weeklyAvg === "number" ? hrvDTO.weeklyAvg : 
                        (typeof hrvDTO.weeklyHrv === "number" ? hrvDTO.weeklyHrv : null);
    const hrvBaselineLow = typeof hrvDTO.baselineLow === "number" ? hrvDTO.baselineLow : 
                          (typeof hrvDTO.hrvBaselineLow === "number" ? hrvDTO.hrvBaselineLow : null);
    const hrvBaselineHigh = typeof hrvDTO.baselineHigh === "number" ? hrvDTO.baselineHigh : 
                           (typeof hrvDTO.hrvBaselineHigh === "number" ? hrvDTO.hrvBaselineHigh : null);

    console.log(`Parsed metrics for ${targetDate}:`, {
      sleepScore, deepSleepSeconds, lightSleepSeconds, remSleepSeconds, awakeSeconds,
      lastNightHrvAvg, weeklyHrvAvg, hrvBaselineLow, hrvBaselineHigh
    });

    // 7. Write to Cloudflare D1
    await env.DB.prepare(`
      INSERT INTO garmin_telemetry (
        date, 
        weekly_hrv_avg, 
        last_night_hrv_avg, 
        hrv_baseline_low, 
        hrv_baseline_high, 
        sleep_score, 
        deep_sleep_seconds, 
        light_sleep_seconds, 
        rem_sleep_seconds, 
        awake_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        weekly_hrv_avg = COALESCE(excluded.weekly_hrv_avg, garmin_telemetry.weekly_hrv_avg),
        last_night_hrv_avg = COALESCE(excluded.last_night_hrv_avg, garmin_telemetry.last_night_hrv_avg),
        hrv_baseline_low = COALESCE(excluded.hrv_baseline_low, garmin_telemetry.hrv_baseline_low),
        hrv_baseline_high = COALESCE(excluded.hrv_baseline_high, garmin_telemetry.hrv_baseline_high),
        sleep_score = COALESCE(excluded.sleep_score, garmin_telemetry.sleep_score),
        deep_sleep_seconds = COALESCE(excluded.deep_sleep_seconds, garmin_telemetry.deep_sleep_seconds),
        light_sleep_seconds = COALESCE(excluded.light_sleep_seconds, garmin_telemetry.light_sleep_seconds),
        rem_sleep_seconds = COALESCE(excluded.rem_sleep_seconds, garmin_telemetry.rem_sleep_seconds),
        awake_seconds = COALESCE(excluded.awake_seconds, garmin_telemetry.awake_seconds)
    `).bind(
      targetDate,
      weeklyHrvAvg,
      lastNightHrvAvg,
      hrvBaselineLow,
      hrvBaselineHigh,
      sleepScore,
      deepSleepSeconds,
      lightSleepSeconds,
      remSleepSeconds,
      awakeSeconds
    ).run();

    console.log(`Successfully ingested Garmin daily metrics into D1 for date: ${targetDate}`);

  } catch (err) {
    console.error(`Ingestion task failed with error: ${err.message}`, err.stack);
  }
}

/**
 * Outbound fetch wrapper that verifies token age, refreshes token, and retries on 401s
 */
async function fetchWithRetry(url, env, session, retry = true) {
  let activeSession = await getValidAccessToken(env, session);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${activeSession.access_token}`,
      "User-Agent": "Mozilla/5.0 (Android; Mobile) Garmin Connect Mobile",
      "Accept": "application/json"
    }
  });

  if (response.status === 401 && retry) {
    console.warn(`Garmin Connect returned 401 on ${url}. Access token might be revoked or expired. Refreshing token and retrying...`);
    const refreshedSession = await refreshGarminToken(env, activeSession);
    return fetchWithRetry(url, env, refreshedSession, false);
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Garmin Connect API fetch to ${url} failed with status ${response.status}: ${responseText}`);
  }

  const data = await response.json();
  return { data, session: activeSession };
}

/**
 * Assures the access token is valid, executing a proactive refresh if close to expiry
 */
async function getValidAccessToken(env, session) {
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  const isExpired = !session.expires_at || (Date.now() + bufferTime >= session.expires_at);

  if (isExpired) {
    console.log("Garmin access token expired or expiring soon. Initiating refresh flow...");
    return refreshGarminToken(env, session);
  }
  return session;
}

/**
 * Request new access_token from Garmin Auth Token Endpoint using refresh_token
 */
async function refreshGarminToken(env, session) {
  const url = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Android; Mobile) Garmin Connect Mobile",
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refresh_token
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Garmin OAuth refresh request failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error("Invalid response from Garmin Connect OAuth refresh: missing access_token or refresh_token");
  }

  const expiresIn = data.expires_in || 3600;
  const refreshedSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (expiresIn * 1000)
  };

  // Persist updated session details back to KV
  await env.GARMIN_AUTH_KV.put("session", JSON.stringify(refreshedSession));
  console.log("Successfully cached refreshed Garmin session in KV.");
  
  return refreshedSession;
}
