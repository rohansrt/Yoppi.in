/**
 * YOPPI backend client — a plain ES module, no build step, matching how
 * yoppi.in is currently deployed (static HTML5 + vanilla JS, GitHub Pages).
 *
 * Load it with `<script type="module" src="assets/js/yoppi-client.js">`
 * after `yoppi-config.js` (which sets `window.YOPPI_CONFIG`) — this module
 * self-initializes from that config, no manual initYoppiClient() call
 * needed. It also exposes every export on `window.Yoppi` so the site's
 * existing plain `<script>` files (main.js, signup.js, contact.js,
 * dashboard.js — none of which are ES modules) can call
 * `window.Yoppi.someFunction(...)` directly. Anyone writing a new
 * `type="module"` script can still `import { ... } from "./yoppi-client.js"`
 * as usual.
 *
 * Every exported function's parameter names mirror the existing FE form
 * field names from BACKEND_REQUIREMENTS.md §5/§6 (org-name, org-type, city,
 * headcount, contact-person, designation, phone, interest, etc.) so wiring
 * signup.html / contact.html / services.html up to this client is a
 * mechanical field-name mapping, not a redesign.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let supabase = null;
let functionsUrl = "";

/**
 * Normally called automatically at the bottom of this file from
 * `window.YOPPI_CONFIG` (see yoppi-config.js). Exposed in case a page needs
 * to initialize explicitly instead (both safe to embed in static FE JS —
 * see BACKEND_REQUIREMENTS.md §7).
 */
export function initYoppiClient({ url, anonKey }) {
  if (!url || !anonKey) {
    throw new Error("initYoppiClient requires { url, anonKey }");
  }
  supabase = createClient(url, anonKey);
  functionsUrl = `${url.replace(/\/$/, "")}/functions/v1`;
  return supabase;
}

function requireClient() {
  if (!supabase) {
    throw new Error("Call initYoppiClient({ url, anonKey }) before using the YOPPI client.");
  }
  return supabase;
}

async function callFunction(name, body) {
  const res = await fetch(`${functionsUrl}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${name} failed (${res.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// hCaptcha widget rendering. hCaptcha's own <script> tag loads
// asynchronously, so any form that needs a token has to wait for
// `window.hcaptcha` to exist rather than assuming it's ready — this is that
// wait, done once and shared by every form (signup, contact, services
// booking modal, login modal).
// ---------------------------------------------------------------------------

let hcaptchaReadyPromise = null;

function waitForHcaptcha() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("renderHcaptcha: no window"));
  }
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (!hcaptchaReadyPromise) {
    hcaptchaReadyPromise = new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        if (window.hcaptcha) return resolve(window.hcaptcha);
        if (Date.now() - startedAt > 10000) {
          return reject(new Error("hCaptcha script did not load in time"));
        }
        setTimeout(check, 100);
      };
      check();
    });
  }
  return hcaptchaReadyPromise;
}

/**
 * Renders an hCaptcha checkbox into `containerId` and returns a handle to
 * read/reset its response token. Reads the site key from
 * `window.YOPPI_CONFIG.HCAPTCHA_SITE_KEY` (see yoppi-config.js).
 */
export async function renderHcaptcha(containerId, { onVerify, onExpire } = {}) {
  const hcaptcha = await waitForHcaptcha();
  const siteKey = typeof window !== "undefined" ? window.YOPPI_CONFIG?.HCAPTCHA_SITE_KEY : undefined;
  if (!siteKey) {
    throw new Error("renderHcaptcha: window.YOPPI_CONFIG.HCAPTCHA_SITE_KEY is not set");
  }
  const widgetId = hcaptcha.render(containerId, {
    sitekey: siteKey,
    callback: onVerify,
    "expired-callback": onExpire,
  });
  return {
    widgetId,
    getResponse: () => hcaptcha.getResponse(widgetId),
    reset: () => hcaptcha.reset(widgetId),
  };
}

// ---------------------------------------------------------------------------
// Auth: signup, login, logout, password reset. Session/refresh-token
// handling is entirely delegated to the Supabase JS SDK — no manual token
// storage needed (BACKEND_REQUIREMENTS.md §4).
// ---------------------------------------------------------------------------

/**
 * The upgraded signup.html flow (BACKEND_REQUIREMENTS.md §4): one call
 * creates the auth user (triggers the verification email), the
 * organization, the org_admin profile, and an enquiries record, atomically,
 * via a DB trigger — see supabase/migrations/20260721120500_signup_trigger.sql.
 *
 * `hcaptchaToken` is passed straight through to Supabase Auth's own
 * built-in captcha check (configured in supabase/config.toml), not a
 * custom Edge Function — signup/login are Auth endpoints, not PostgREST.
 */
export async function signupOrganization({
  orgName,
  orgType,
  city,
  headcountRange,
  contactPerson,
  designation,
  phone,
  email,
  password,
  interest,
  selectedSports,
  hcaptchaToken,
}) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      captchaToken: hcaptchaToken,
      data: {
        signup_type: "org_signup",
        org_name: orgName,
        org_type: orgType,
        city,
        headcount_range: headcountRange,
        full_name: contactPerson,
        designation,
        phone,
        interest,
        selected_sports: selectedSports ?? null,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function login({ email, password, hcaptchaToken }) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: hcaptchaToken },
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  const client = requireClient();
  return client.auth.onAuthStateChange(callback);
}

export async function requestPasswordReset(email, redirectTo, hcaptchaToken) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
    captchaToken: hcaptchaToken,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Public reference data (plans, sports). Readable by anyone, including
// anonymous visitors — used to build services.html's pricing cards and the
// "Book Now" sports checklist from real rows instead of a hardcoded list,
// so selections carry real ids through to submitEnquiry().
// ---------------------------------------------------------------------------

export async function getPlans() {
  const client = requireClient();
  const { data, error } = await client.from("plans").select("*").order("sla_hours", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSports() {
  const client = requireClient();
  const { data, error } = await client.from("sports").select("*").order("name");
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Public lead-capture forms. Both go through Edge Functions (not a direct
// table insert) so hCaptcha can be verified server-side — see
// supabase/functions/submit-enquiry and submit-contact.
// ---------------------------------------------------------------------------

/** contact.html */
export async function submitContact({ name, org, email, phone, role, message, hcaptchaToken }) {
  return callFunction("submit-contact", {
    name,
    org,
    email,
    phone,
    role,
    message,
    hcaptcha_token: hcaptchaToken,
  });
}

/** services.html "Book Now" -> sports checklist -> Continue */
export async function submitEnquiry({
  orgName,
  orgType,
  city,
  contactPerson,
  designation,
  email,
  phone,
  headcountRange,
  interest,
  selectedSports,
  hcaptchaToken,
}) {
  return callFunction("submit-enquiry", {
    org_name: orgName,
    org_type: orgType,
    city,
    contact_person: contactPerson,
    designation,
    email,
    phone,
    headcount_range: headcountRange,
    interest,
    selected_sports: selectedSports,
    hcaptcha_token: hcaptchaToken,
  });
}

// ---------------------------------------------------------------------------
// Dashboard reads. All auto-scoped to the logged-in user's org via RLS —
// no org_id filtering needed client-side (BACKEND_REQUIREMENTS.md §6).
// ---------------------------------------------------------------------------

/** Includes the embedded `plans` row (name/features/sla_hours) via the plan_id FK, for the dashboard's subscription line. */
export async function getMyOrganization() {
  const client = requireClient();
  const { data, error } = await client.from("organizations").select("*, plans(*)").single();
  if (error) throw error;
  return data;
}

/** The logged-in user's own profile — name/designation for the dashboard header. */
export async function getMyProfile() {
  const client = requireClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("getMyProfile: no active session");

  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function getEquipment() {
  const client = requireClient();
  const { data, error } = await client.from("equipment").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getMaintenanceTickets() {
  const client = requireClient();
  const { data, error } = await client
    .from("maintenance_tickets")
    .select("*, equipment(name), vendors(name, contact_info)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMaintenanceSchedule() {
  const client = requireClient();
  const { data, error } = await client
    .from("maintenance_schedule")
    .select("*")
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return data;
}

/** Sports covered / equipment / needs-attention / upcoming-maintenance counts. */
export async function getDashboardKpis() {
  const client = requireClient();
  const { data, error } = await client.rpc("get_org_kpis");
  if (error) throw error;
  return data;
}

export async function getNotifications() {
  const client = requireClient();
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId) {
  const client = requireClient();
  const { error } = await client
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

/** Fetches everything dashboard.html needs in one call. */
export async function getDashboardData() {
  const [profile, organization, equipment, maintenanceTickets, maintenanceSchedule, kpis, notifications] =
    await Promise.all([
      getMyProfile(),
      getMyOrganization(),
      getEquipment(),
      getMaintenanceTickets(),
      getMaintenanceSchedule(),
      getDashboardKpis(),
      getNotifications(),
    ]);
  return { profile, organization, equipment, maintenanceTickets, maintenanceSchedule, kpis, notifications };
}

// ---------------------------------------------------------------------------
// Self-init from window.YOPPI_CONFIG (see yoppi-config.js) + a window.Yoppi
// bridge for the site's existing non-module <script> files. Both no-ops
// outside a browser (e.g. if this file is ever imported from a test runner).
// ---------------------------------------------------------------------------

if (typeof window !== "undefined" && window.YOPPI_CONFIG?.SUPABASE_URL && window.YOPPI_CONFIG?.SUPABASE_ANON_KEY) {
  initYoppiClient({
    url: window.YOPPI_CONFIG.SUPABASE_URL,
    anonKey: window.YOPPI_CONFIG.SUPABASE_ANON_KEY,
  });
}

if (typeof window !== "undefined") {
  window.Yoppi = {
    initYoppiClient,
    renderHcaptcha,
    signupOrganization,
    login,
    logout,
    getSession,
    onAuthStateChange,
    requestPasswordReset,
    updatePassword,
    getPlans,
    getSports,
    submitContact,
    submitEnquiry,
    getMyOrganization,
    getMyProfile,
    getEquipment,
    getMaintenanceTickets,
    getMaintenanceSchedule,
    getDashboardKpis,
    getNotifications,
    markNotificationRead,
    getDashboardData,
  };
  window.dispatchEvent(new CustomEvent("yoppi:ready"));
}
