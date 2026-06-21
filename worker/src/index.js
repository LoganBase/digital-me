/**
 * Cloudflare Worker for DigitalMe Data Ingestion
 */

export default {
  // HTTP Endpoint Handler
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    // Authentication check using Bearer Token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Bearer Token" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);
    if (token !== env.AUTH_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid Token" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Router
    if (request.method === "POST" && url.pathname === "/api/ingest/hilo") {
      try {
        // Parse payload
        const payload = await request.json();
        if (!Array.isArray(payload)) {
          return new Response(JSON.stringify({ error: "Invalid payload: Expected an array of blood pressure metrics" }), {
            status: 400,
            headers: corsHeaders
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
              headers: corsHeaders
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
              headers: corsHeaders
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
          headers: corsHeaders
        });

      } catch (error) {
        console.error("Ingestion Failure:", error.message, error.stack);
        return new Response(JSON.stringify({
          error: "Internal Server Error",
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    } else if (request.method === "GET" && url.pathname === "/api/telemetry/summary") {
      try {
        console.log("Fetching summary telemetry from D1 database...");
        
        const garmin = await env.DB.prepare(
          "SELECT * FROM garmin_telemetry ORDER BY date DESC LIMIT 30"
        ).all();

        const withings = await env.DB.prepare(
          "SELECT * FROM withings_telemetry ORDER BY date DESC LIMIT 30"
        ).all();

        const hilo = await env.DB.prepare(
          "SELECT * FROM hilo_bp ORDER BY timestamp DESC LIMIT 50"
        ).all();

        return new Response(JSON.stringify({
          success: true,
          data: {
            garmin: garmin.results || [],
            withings: withings.results || [],
            hilo: hilo.results || []
          }
        }), {
          status: 200,
          headers: corsHeaders
        });
      } catch (error) {
        console.error("Fetch Telemetry Failure:", error.message, error.stack);
        return new Response(JSON.stringify({
          error: "Internal Server Error",
          details: error.message
        }), {
          status: 500,
          headers: corsHeaders
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: corsHeaders
      });
    }
  },

  // Cron Trigger Handler
  async scheduled(event, env, ctx) {
    console.log(`Cron trigger fired at ${new Date().toISOString()}`);
    ctx.waitUntil(
      Promise.allSettled([
        handleGarminDailyIngestion(env),
        handleWithingsDailyIngestion(env)
      ]).then(results => {
        results.forEach((res, idx) => {
          const taskName = idx === 0 ? "Garmin" : "Withings";
          if (res.status === "rejected") {
            console.error(`${taskName} ingestion rejected with error:`, res.reason);
          } else {
            console.log(`${taskName} ingestion completed successfully.`);
          }
        });
      })
    );
  }
};

/**
 * ============================================================================
 * GARMIN TELEMETRY INGESTION PIPELINE
 * ============================================================================
 */

/**
 * Main ingestion handler for fetching Garmin health metrics and inserting them into D1
 */
async function handleGarminDailyIngestion(env) {
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - 1);
  const targetDate = dateObj.toISOString().split("T")[0];
  console.log(`Target date for Garmin Connect ingestion: ${targetDate}`);

  try {
    let sessionStr = await env.GARMIN_AUTH_KV.get("session");
    if (!sessionStr) {
      console.error("Garmin mobile session not found in KV (key: 'session'). Ingestion skipped.");
      return;
    }

    let sessionObj = JSON.parse(sessionStr);
    let sleepData = null;
    let hrvData = null;

    // Fetch sleep summaries
    try {
      const sleepRes = await fetchGarminWithRetry(
        `https://connect.garmin.com/user-service/user/sleep/daily/${targetDate}`,
        env,
        sessionObj
      );
      sleepData = sleepRes.data;
      sessionObj = sleepRes.session;
    } catch (err) {
      console.error(`Failed to fetch sleep data for ${targetDate}: ${err.message}`);
    }

    // Fetch HRV summaries
    try {
      const hrvRes = await fetchGarminWithRetry(
        `https://connect.garmin.com/hrv-service/hrv/daily/${targetDate}`,
        env,
        sessionObj
      );
      hrvData = hrvRes.data;
      sessionObj = hrvRes.session;
    } catch (err) {
      console.error(`Failed to fetch HRV data for ${targetDate}: ${err.message}`);
    }

    if (!sleepData && !hrvData) {
      console.warn("No Garmin telemetry data retrieved. Skipping D1 database write.");
      return;
    }

    // Parse sleep metrics
    const sleepDTO = (sleepData && sleepData.dailySleepDTO) ? sleepData.dailySleepDTO : {};
    const sleepScore = typeof sleepDTO.sleepScore === "number" ? sleepDTO.sleepScore : null;
    const deepSleepSeconds = typeof sleepDTO.deepSleepSeconds === "number" ? sleepDTO.deepSleepSeconds : null;
    const lightSleepSeconds = typeof sleepDTO.lightSleepSeconds === "number" ? sleepDTO.lightSleepSeconds : null;
    const remSleepSeconds = typeof sleepDTO.remSleepSeconds === "number" ? sleepDTO.remSleepSeconds : null;
    const awakeSeconds = typeof sleepDTO.awakeSeconds === "number" ? sleepDTO.awakeSeconds : null;

    // Parse HRV metrics
    const hrvDTO = (hrvData && hrvData.hrvSummary) ? hrvData.hrvSummary : {};
    const lastNightHrvAvg = typeof hrvDTO.lastNightAvg === "number" ? hrvDTO.lastNightAvg : 
                           (typeof hrvDTO.lastNightHrv === "number" ? hrvDTO.lastNightHrv : null);
    const weeklyHrvAvg = typeof hrvDTO.weeklyAvg === "number" ? hrvDTO.weeklyAvg : 
                        (typeof hrvDTO.weeklyHrv === "number" ? hrvDTO.weeklyHrv : null);
    const hrvBaselineLow = typeof hrvDTO.baselineLow === "number" ? hrvDTO.baselineLow : 
                          (typeof hrvDTO.hrvBaselineLow === "number" ? hrvDTO.hrvBaselineLow : null);
    const hrvBaselineHigh = typeof hrvDTO.baselineHigh === "number" ? hrvDTO.baselineHigh : 
                           (typeof hrvDTO.hrvBaselineHigh === "number" ? hrvDTO.hrvBaselineHigh : null);

    console.log(`Parsed Garmin metrics for ${targetDate}:`, {
      sleepScore, deepSleepSeconds, lightSleepSeconds, remSleepSeconds, awakeSeconds,
      lastNightHrvAvg, weeklyHrvAvg, hrvBaselineLow, hrvBaselineHigh
    });

    // Write to Cloudflare D1
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
    console.error(`Garmin ingestion task failed with error: ${err.message}`, err.stack);
  }
}

/**
 * Outbound fetch wrapper that verifies token age, refreshes token, and retries on 401s
 */
async function fetchGarminWithRetry(url, env, session, retry = true) {
  let activeSession = await getValidGarminAccessToken(env, session);

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
    return fetchGarminWithRetry(url, env, refreshedSession, false);
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
async function getValidGarminAccessToken(env, session) {
  const bufferTime = 5 * 60 * 1000;
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

  await env.GARMIN_AUTH_KV.put("session", JSON.stringify(refreshedSession));
  console.log("Successfully cached refreshed Garmin session in KV.");
  
  return refreshedSession;
}


/**
 * ============================================================================
 * WITHINGS TELEMETRY INGESTION PIPELINE
 * ============================================================================
 */

/**
 * Main ingestion handler for fetching body composition data from the Withings Public REST API and storing it in D1
 */
async function handleWithingsDailyIngestion(env) {
  console.log("Initiating Withings daily telemetry ingestion...");
  try {
    // 1. Load Withings session tokens
    let session = await getWithingsSession(env);
    if (!session) {
      console.error("Withings OAuth tokens not found in KV or environment secrets. Ingestion skipped.");
      return;
    }

    // 2. Fetch measurements from Withings Measure API (last 48 hours)
    const { data, session: updatedSession } = await fetchWithingsWithRetry(env, session);
    
    const measuregrps = data.body?.measuregrps || [];
    if (measuregrps.length === 0) {
      console.log("No new Withings body composition groups found in the last 48 hours.");
      return;
    }

    // 3. Sort groups chronologically to ensure latest measurements take precedence
    const sortedGroups = measuregrps.sort((a, b) => a.date - b.date);

    // 4. Parse and write each group to D1
    for (const group of sortedGroups) {
      const groupDate = new Date(group.date * 1000).toISOString().split("T")[0];
      
      let weight_kg = null;
      let muscle_mass_kg = null;
      let visceral_fat_rating = null;
      let extracellular_water_liters = null;
      let vascular_age = null;
      let eda_nerve_score = null;

      for (const measure of group.measures) {
        // Convert to true float: value * 10^unit
        const val = measure.value * Math.pow(10, measure.unit);
        switch (measure.type) {
          case 1:
            weight_kg = val;
            break;
          case 76:
            muscle_mass_kg = val;
            break;
          case 168:
            extracellular_water_liters = val;
            break;
          case 170:
            visceral_fat_rating = val;
            break;
          case 155:
            vascular_age = val;
            break;
          case 167:
            eda_nerve_score = val;
            break;
        }
      }

      // Convert muscle mass kg to percentage of total body weight
      let muscle_mass_pct = null;
      if (muscle_mass_kg !== null && weight_kg !== null && weight_kg > 0) {
        muscle_mass_pct = (muscle_mass_kg / weight_kg) * 100;
      }

      console.log(`Upserting Withings metrics for date ${groupDate}:`, {
        weight_kg, visceral_fat_rating, muscle_mass_pct, extracellular_water_liters, vascular_age, eda_nerve_score
      });

      await env.DB.prepare(`
        INSERT INTO withings_telemetry (
          date,
          weight_kg,
          visceral_fat_rating,
          muscle_mass_pct,
          extracellular_water_liters,
          vascular_age,
          eda_nerve_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          weight_kg = COALESCE(excluded.weight_kg, withings_telemetry.weight_kg),
          visceral_fat_rating = COALESCE(excluded.visceral_fat_rating, withings_telemetry.visceral_fat_rating),
          muscle_mass_pct = COALESCE(excluded.muscle_mass_pct, withings_telemetry.muscle_mass_pct),
          extracellular_water_liters = COALESCE(excluded.extracellular_water_liters, withings_telemetry.extracellular_water_liters),
          vascular_age = COALESCE(excluded.vascular_age, withings_telemetry.vascular_age),
          eda_nerve_score = COALESCE(excluded.eda_nerve_score, withings_telemetry.eda_nerve_score)
      `).bind(
        groupDate,
        weight_kg,
        visceral_fat_rating,
        muscle_mass_pct,
        extracellular_water_liters,
        vascular_age,
        eda_nerve_score
      ).run();
    }

    console.log("Successfully completed Withings daily telemetry ingestion.");

  } catch (err) {
    console.error(`Withings daily ingestion task failed with error: ${err.message}`, err.stack);
  }
}

/**
 * Retrieve session state from KV with standard fallback to Environment Secrets
 */
async function getWithingsSession(env) {
  let sessionStr = await env.GARMIN_AUTH_KV.get("withings_session");
  if (sessionStr) {
    return JSON.parse(sessionStr);
  }

  // Fallback to static secrets if KV is empty (useful for initialization)
  if (env.WITHINGS_ACCESS_TOKEN && env.WITHINGS_REFRESH_TOKEN) {
    const session = {
      access_token: env.WITHINGS_ACCESS_TOKEN,
      refresh_token: env.WITHINGS_REFRESH_TOKEN,
      expires_at: 0
    };
    // Cache in KV immediately
    await env.GARMIN_AUTH_KV.put("withings_session", JSON.stringify(session));
    return session;
  }

  return null;
}

/**
 * Outbound fetch wrapper for Withings measure API including proactive / reactive token refresh
 */
async function fetchWithingsWithRetry(env, session, retry = true) {
  let activeSession = session;
  
  const bufferTime = 5 * 60 * 1000;
  if (!activeSession.expires_at || Date.now() + bufferTime >= activeSession.expires_at) {
    activeSession = await refreshWithingsToken(env, activeSession);
  }

  try {
    const data = await fetchWithingsMeasureData(env, activeSession);
    return { data, session: activeSession };
  } catch (err) {
    if (retry) {
      console.warn(`Withings request failed (${err.message}). Attempting token refresh and retry...`);
      const refreshedSession = await refreshWithingsToken(env, activeSession);
      return fetchWithingsWithRetry(env, refreshedSession, false);
    }
    throw err;
  }
}

/**
 * Executes signed POST request to the Withings measure endpoint
 */
async function fetchWithingsMeasureData(env, session) {
  // 1. Obtain single-use nonce
  const nonce = await getWithingsNonce(env);
  
  // 2. Generate HMAC signature for action 'getmeas'
  const signature = await generateWithingsSignature(
    "getmeas",
    env.WITHINGS_CLIENT_ID,
    nonce,
    env.WITHINGS_CLIENT_SECRET
  );
  
  const startdate = Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60); // fetch last 48 hours

  const response = await fetch("https://wbsapi.withings.net/v2/measure", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      action: "getmeas",
      client_id: env.WITHINGS_CLIENT_ID,
      nonce: nonce,
      signature: signature,
      meastypes: "1,76,168,170,155,167",
      category: "1",
      startdate: startdate.toString()
    })
  });

  if (!response.ok) {
    throw new Error(`Withings Measure API HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 0) {
    throw new Error(`Withings Measure API error (status ${data.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Retrieve a single-use nonce from Withings /v2/signature API
 */
async function getWithingsNonce(env) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Generate signature for getnonce
  const signature = await generateWithingsSignature(
    "getnonce",
    env.WITHINGS_CLIENT_ID,
    timestamp.toString(),
    env.WITHINGS_CLIENT_SECRET
  );

  const response = await fetch("https://wbsapi.withings.net/v2/signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      action: "getnonce",
      client_id: env.WITHINGS_CLIENT_ID,
      timestamp: timestamp.toString(),
      signature: signature
    })
  });

  if (!response.ok) {
    throw new Error(`Withings Signature API HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 0) {
    throw new Error(`Withings getnonce API error (status ${data.status}): ${JSON.stringify(data)}`);
  }

  return data.body.nonce;
}

/**
 * Helper to generate HMAC-SHA256 signature using the native Web Crypto API
 */
async function generateWithingsSignature(action, clientId, nonceOrTimestamp, clientSecret) {
  // Sort parameters alphabetically: action, client_id, nonce/timestamp
  const message = `${action},${clientId},${nonceOrTimestamp}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(clientSecret);
  const messageData = encoder.encode(message);

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Generate signature
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );

  // Convert binary buffer to Hex String
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Refreshes OAuth 2.0 access token using Withings API endpoint
 */
async function refreshWithingsToken(env, session) {
  const url = "https://account.withings.com/oauth2/token";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.WITHINGS_CLIENT_ID,
      client_secret: env.WITHINGS_CLIENT_SECRET,
      refresh_token: session.refresh_token
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Withings token refresh request failed (HTTP ${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Withings OAuth2 error: ${data.error_description || data.error}`);
  }

  const expiresIn = data.expires_in || 10800; // default 3 hours
  const refreshedSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (expiresIn * 1000)
  };

  // Cache back to KV
  await env.GARMIN_AUTH_KV.put("withings_session", JSON.stringify(refreshedSession));
  console.log("Successfully cached refreshed Withings session in KV.");
  
  return refreshedSession;
}
