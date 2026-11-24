const SUPABASE_URL = "https://atrwhvyhopifugphfcpe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9jauFOO0mFzTSs5rtI2Orw_ZekPGGdt";
const OWNER_EMAIL = "mahdim495mk@gmail.com";
const CARD_NUMBER = "6037998221406068";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let supabaseClientPromise = null;
let authListenerInstalled = false;
async function getSupabase() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("https://esm.sh/@supabase/supabase-js@2.95.0")
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY))
      .catch((error) => {
        supabaseClientPromise = null;
        toast("اتصال به سرویس ابری برقرار نشد؛ دوباره تلاش کن.");
        throw error;
      });
  }
  const client = await supabaseClientPromise;
  if (!authListenerInstalled) {
    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        const password = prompt("رمز عبور جدید (حداقل ۸ کاراکتر):");
        if (password && password.length >= 8) {
          client.auth.updateUser({ password }).then(({ error }) => {
            toast(error ? "تغییر رمز انجام نشد." : "رمز عبور تغییر کرد.");
          });
        }
      }
      if (event === "SIGNED_OUT" && location.hash.replace(/^#/, "").startsWith("admin")) {
        $("#dashboard-view").classList.add("hidden");
        $("#login-view").classList.remove("hidden");
        setAuthMode("login");
      }
    });
    authListenerInstalled = true;
  }
  return client;
}
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

let entries = [];
let orders = [];
let toastTimer;

function toast(text) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2700);
}

function message(el, text, bad = false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#edb2a1" : "#b4d9bd";
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  toast("کپی شد.");
}

function fmtDate(value) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

const TELEGRAM_HEALTH_URL = "https://qaxiunpklkbgfjwmpwfp.supabase.co/functions/v1/moghimi-telegram";

async function setupTelegramPurchase() {
  const link = $("#telegram-buy-link");
  const status = $("#telegram-bot-status");
  if (!link || !status) return;

  try {
    const response = await fetch(TELEGRAM_HEALTH_URL, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const health = await response.json();
    if (health.bot_username) {
      const username = String(health.bot_username).replace(/^@/, "");
      if (/^[A-Za-z0-9_]{5,32}$/.test(username)) {
        link.href = "https://t.me/" + encodeURIComponent(username);
        link.removeAttribute("aria-disabled");
        status.textContent = health.ok
          ? "ربات @" + username + " آمادهٔ سفارش است."
          : "ربات شناسایی شد؛ وضعیت اتصال در حال بررسی است.";
        return;
      }
    }
    throw new Error("Bot username is unavailable");
  } catch {
    status.textContent = "فعلاً دریافت لینک ربات ممکن نشد؛ کمی بعد دوباره امتحان کن.";
  }
}

setupTelegramPurchase();

async function loadPublicCount() {
  const count = $("#public-count");
  const status = $("#public-count-status");
  if (!count) return;
  if (status) status.textContent = "در حال دریافت تعداد کانفیگ‌های فعال…";
  let activeCount = null;
  try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/v2ray_entries?select=id&is_active=eq.true", {
      method: "HEAD", cache: "no-store",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" }
    });
    const contentRange = response.headers.get("Content-Range") || "";
    const rawCount = contentRange.slice(contentRange.lastIndexOf("/") + 1);
    const parsedCount = Number(rawCount);
    if (response.ok && rawCount !== "" && Number.isSafeInteger(parsedCount) && parsedCount >= 0) activeCount = parsedCount;
  } catch {
    // The public counter is optional; the rest of the website remains usable.
  }
  if (activeCount === null) {
    count.textContent = "—";
    if (status) status.textContent = "تعداد کانفیگ‌های فعال فعلاً در دسترس نیست.";
    return;
  }
  count.textContent = new Intl.NumberFormat("fa-IR").format(activeCount);
  if (status) status.textContent = activeCount > 0 ? "تعداد به‌روزِ کانفیگ‌های فعال" : "فعلاً کانفیگ فعالی منتشر نشده است.";
}

function openOrder() {
  const panel = $("#order-modal");
  if (!panel) return;
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => panel.querySelector('input[name="full_name"]')?.focus(), 250);
}

function closeOrder() {
  const panel = $("#order-modal");
  panel?.classList.add("hidden");
  $("#open-order")?.focus();
}

$("#open-order")?.addEventListener("click", openOrder);
$("#close-order")?.addEventListener("click", closeOrder);
$("#finish-order")?.addEventListener("click", () => {
  closeOrder();
  $("#order-form").classList.remove("hidden");
  $("#order-success").classList.add("hidden");
  $("#order-message").textContent = "";
});
$("#order-modal")?.addEventListener("click", (event) => {
  if (event.target.id === "order-modal") closeOrder();
});
$("#copy-card")?.addEventListener("click", () => copy(CARD_NUMBER));

$("#order-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = await getSupabase();
  const form = event.currentTarget;
  const button = $("#submit-order");
  const msg = $("#order-message");
  const values = new FormData(form);
  const id = crypto.randomUUID();

  const row = {
    id,
    full_name: String(values.get("full_name") || "").trim(),
    platform: String(values.get("platform") || "تلگرام").trim(),
    platform_id: String(values.get("platform_id") || "").trim(),
    phone: String(values.get("phone") || "").trim() || null,
    notes: String(values.get("notes") || "").trim()
  };

  button.disabled = true;
  button.innerHTML = "<span>در حال ثبت…</span>";
  message(msg, "");

  const { error } = await client.from("orders").insert(row);
  button.disabled = false;
  button.innerHTML = "<span>ثبت درخواست</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";

  if (error) {
    message(msg, "ثبت درخواست انجام نشد. اطلاعات رو بررسی و دوباره تلاش کن.", true);
    return;
  }

  try {
    await client.functions.invoke("notify-order", { body: { orderId: id } });
  } catch {
    // The order is already stored; email notification failure must not hide success.
  }

  form.classList.add("hidden");
  $("#order-success").classList.remove("hidden");
  form.reset();
  form.elements.platform.value = "تلگرام";
});

function setAuthMode(mode) {
  const registering = mode === "register";
  $("#login-form").classList.toggle("hidden", registering);
  $("#register-form").classList.toggle("hidden", !registering);
  $("#auth-tab-login").classList.toggle("active", !registering);
  $("#auth-tab-register").classList.toggle("active", registering);
  $("#auth-tab-login").setAttribute("aria-selected", String(!registering));
  $("#auth-tab-register").setAttribute("aria-selected", String(registering));
  $("#login-message").textContent = "";
  $("#register-message").textContent = "";
}

$("#auth-tab-login")?.addEventListener("click", () => setAuthMode("login"));
$("#auth-tab-register")?.addEventListener("click", () => setAuthMode("register"));

function route() {
  const admin = location.hash.replace(/^#/, "").startsWith("admin");
  $("#admin-view").classList.toggle("hidden", !admin);
  $("#home").classList.toggle("hidden", admin);
  $(".topbar").classList.toggle("hidden", admin);
  $(".footer").classList.toggle("hidden", admin);
  $(".mobile-nav")?.classList.toggle("hidden", admin);
  if (admin) initAdmin();
  else loadPublicCount();
}

window.addEventListener("hashchange", route);

async function initAdmin() {
  const client = await getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (session?.user?.email?.toLowerCase() === OWNER_EMAIL) {
    showDashboard(session.user);
  } else {
    if (session) await client.auth.signOut();
    $("#login-view").classList.remove("hidden");
    $("#dashboard-view").classList.add("hidden");
    setAuthMode("login");
  }
}

function showDashboard(user) {
  if (user.email?.toLowerCase() !== OWNER_EMAIL) return;
  $("#login-view").classList.add("hidden");
  $("#dashboard-view").classList.remove("hidden");
  $("#admin-email").textContent = user.email;
  loadDashboard();
}

$("#login-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = await getSupabase();
  const button = $("#login-submit");
  const values = new FormData(event.currentTarget);
  button.disabled = true;
  button.innerHTML = "<span>در حال ورود…</span>";
  message($("#login-message"), "");

  const { data, error } = await client.auth.signInWithPassword({
    email: String(values.get("email")).trim().toLowerCase(),
    password: String(values.get("password"))
  });

  button.disabled = false;
  button.innerHTML = "<span>ورود به پنل</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";

  if (error) {
    message($("#login-message"), "ورود ناموفق بود؛ ایمیل و رمز رو بررسی کن.", true);
    return;
  }
  if (data.user?.email?.toLowerCase() !== OWNER_EMAIL) {
    await client.auth.signOut();
    message($("#login-message"), "این حساب اجازه‌ی ورود به پنل رو نداره.", true);
    return;
  }
  showDashboard(data.user);
});

$("#register-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = await getSupabase();
  const form = event.currentTarget;
  const values = new FormData(form);
  const email = String(values.get("email") || "").trim().toLowerCase();
  const password = String(values.get("password") || "");
  const confirmation = String(values.get("confirm_password") || "");
  const button = $("#register-submit");
  const msg = $("#register-message");

  if (email !== OWNER_EMAIL) {
    message(msg, "ساخت حساب فقط برای صاحب پنل مجازه.", true);
    return;
  }
  if (password.length < 8) {
    message(msg, "رمز عبور باید حداقل ۸ کاراکتر داشته باشه.", true);
    return;
  }
  if (password !== confirmation) {
    message(msg, "تکرار رمز عبور با رمز اصلی یکی نیست.", true);
    return;
  }

  button.disabled = true;
  button.innerHTML = "<span>در حال ساخت حساب…</span>";
  message(msg, "");

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: location.origin + location.pathname + "#admin"
    }
  });

  button.disabled = false;
  button.innerHTML = "<span>ساخت حساب</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";

  if (error) {
    message(msg, "ساخت حساب انجام نشد. تنظیمات ثبت‌نام و ایمیل Supabase رو بررسی کن.", true);
    return;
  }

  if (data.session && data.user?.email?.toLowerCase() === OWNER_EMAIL) {
    showDashboard(data.user);
    return;
  }
  message(msg, "حساب ثبت شد. لینک تأیید رو از ایمیلت باز کن، بعد از همین صفحه وارد شو.");
  form.reset();
});

$("#forgot-password")?.addEventListener("click", async () => {
  const client = await getSupabase();
  const email = $("#login-form [name=email]").value.trim().toLowerCase();
  if (email !== OWNER_EMAIL) {
    message($("#login-message"), "ایمیل واردشده برای حساب مدیر معتبر نیست.", true);
    return;
  }
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname + "#admin"
  });
  message($("#login-message"),
    error ? "ارسال لینک بازیابی ممکن نشد؛ تنظیمات ایمیل Supabase رو بررسی کن."
      : "لینک بازیابی به ایمیلت ارسال شد.",
    Boolean(error)
  );
});

$("#logout")?.addEventListener("click", async () => {
  const client = await getSupabase();
  await client.auth.signOut();
  toast("از پنل خارج شدی.");
});
$("#refresh-data")?.addEventListener("click", loadDashboard);

async function loadDashboard() {
  const client = await getSupabase();
  const [configs, requests] = await Promise.all([
    client.from("v2ray_entries").select("*").order("created_at", { ascending: false }),
    client.from("orders").select("*").order("created_at", { ascending: false }).limit(100)
  ]);

  if (configs.error || requests.error) {
    toast("بارگذاری اطلاعات ناموفق بود؛ نشست مدیر رو دوباره بررسی کن.");
    return;
  }

  entries = configs.data || [];
  orders = requests.data || [];
  $("#stat-configs").textContent = new Intl.NumberFormat("fa-IR").format(entries.length);
  $("#stat-orders").textContent = new Intl.NumberFormat("fa-IR").format(orders.filter((x) => x.status === "new").length);
  $("#stat-total-orders").textContent = new Intl.NumberFormat("fa-IR").format(orders.length);
  renderEntries();
  renderOrders();
}

function renderEntries() {
  const box = $("#admin-entries");
  if (!entries.length) {
    box.innerHTML = '<div class="empty-state">هنوز کانفیگی اضافه نکردی.</div>';
    return;
  }

  box.innerHTML = entries.map((entry) =>
    '<article class="admin-entry">' +
      '<div class="admin-entry-info"><strong>' + esc(entry.title) + '</strong><small>' +
      (entry.entry_type === "text" ? "متن" : "فایل") + ' · <span class="' +
      (entry.is_active ? "status-active" : "status-inactive") + '">' +
      (entry.is_active ? "نمایش در سایت" : "مخفی") + '</span></small></div>' +
      '<div class="admin-entry-actions">' +
      '<button class="mini-button" data-edit="' + esc(entry.id) + '">ویرایش</button>' +
      '<button class="mini-button" data-toggle="' + esc(entry.id) + '">' + (entry.is_active ? "مخفی" : "انتشار") + '</button>' +
      '<button class="mini-button" data-delete="' + esc(entry.id) + '">حذف</button>' +
      '</div></article>'
  ).join("");

  $$("[data-edit]", box).forEach((button) => button.onclick = () => editEntry(button.dataset.edit));
  $$("[data-toggle]", box).forEach((button) => button.onclick = () => toggleEntry(button.dataset.toggle));
  $$("[data-delete]", box).forEach((button) => button.onclick = () => deleteEntry(button.dataset.delete));
}

function renderOrders() {
  const body = $("#orders-list");
  const labels = { new: "جدید", contacted: "تماس گرفته شد", completed: "تکمیل شد", cancelled: "لغو شد" };

  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">هنوز درخواستی ثبت نشده.</td></tr>';
    return;
  }

  body.innerHTML = orders.map((order) =>
    '<tr><td><strong>' + esc(order.full_name) + '</strong><small>' + esc(order.id.slice(0, 8)) + '</small></td>' +
    '<td>' + esc(order.platform) + '<small>' + esc(order.platform_id) + '</small></td>' +
    '<td>' + esc(order.phone || "—") + '</td><td>' + esc(order.notes || "—") + '</td>' +
    '<td>' + esc(fmtDate(order.created_at)) + '<small>۲۱۰٬۰۰۰ تومان</small></td>' +
    '<td><select class="status-select" data-status="' + esc(order.id) + '">' +
    Object.entries(labels).map(([key, label]) => '<option value="' + key + '" ' +
      (order.status === key ? "selected" : "") + '>' + label + '</option>').join("") +
    '</select></td></tr>'
  ).join("");

  $$("[data-status]", body).forEach((select) => {
    select.onchange = () => updateStatus(select.dataset.status, select.value);
  });
}

function resetEntry() {
  const form = $("#entry-form");
  form.reset();
  form.elements.entry_id.value = "";
  $("#entry-type").value = "text";
  $("#config-text-field").classList.remove("hidden");
  $("#config-file-field").classList.add("hidden");
  $("#editor-heading").textContent = "افزودن کانفیگ";
  $("#save-entry").innerHTML = "<span>ذخیره کانفیگ</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";
  $("#cancel-edit").classList.add("hidden");
  $("#entry-message").textContent = "";
}

$("#entry-type")?.addEventListener("change", (event) => {
  $("#config-text-field").classList.toggle("hidden", event.target.value !== "text");
  $("#config-file-field").classList.toggle("hidden", event.target.value !== "file");
});
$("#cancel-edit")?.addEventListener("click", resetEntry);

function editEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;

  const form = $("#entry-form");
  form.elements.entry_id.value = entry.id;
  form.elements.title.value = entry.title;
  form.elements.description.value = entry.description || "";
  form.elements.entry_type.value = entry.entry_type;
  form.elements.config_text.value = entry.config_text || "";
  form.elements.is_active.checked = entry.is_active;
  $("#config-text-field").classList.toggle("hidden", entry.entry_type !== "text");
  $("#config-file-field").classList.toggle("hidden", entry.entry_type !== "file");
  $("#editor-heading").textContent = "ویرایش کانفیگ";
  $("#save-entry").innerHTML = "<span>ثبت تغییرات</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";
  $("#cancel-edit").classList.remove("hidden");
  $("#entry-message").textContent = entry.entry_type === "file"
    ? "برای جایگزینی فایل، فایل جدید رو انتخاب کن؛ در غیر این صورت فایل فعلی حفظ می‌شه."
    : "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function toggleEntry(id) {
  const client = await getSupabase();
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const { error } = await client.from("v2ray_entries")
    .update({ is_active: !entry.is_active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return toast("تغییر وضعیت انجام نشد.");
  toast("وضعیت کانفیگ تغییر کرد.");
  loadDashboard();
}

async function deleteEntry(id) {
  const client = await getSupabase();
  const entry = entries.find((item) => item.id === id);
  if (!entry || !confirm("«" + entry.title + "» حذف بشه؟")) return;
  const { error } = await client.from("v2ray_entries").delete().eq("id", id);
  if (error) return toast("حذف کانفیگ ناموفق بود.");
  if (entry.file_path) await client.storage.from("v2ray-files").remove([entry.file_path]);
  toast("کانفیگ حذف شد.");
  loadDashboard();
}

$("#entry-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = await getSupabase();
  const form = event.currentTarget.elements;
  const button = $("#save-entry");
  const msg = $("#entry-message");
  const id = form.entry_id.value || crypto.randomUUID();
  const old = entries.find((item) => item.id === id);
  const type = form.entry_type.value;
  const file = form.config_file.files?.[0];

  if (type === "text" && !form.config_text.value.trim()) return message(msg, "متن کانفیگ رو وارد کن.", true);
  if (type === "file" && !file && !old?.file_path) return message(msg, "یک فایل انتخاب کن.", true);
  if (file && file.size > 20971520) return message(msg, "حداکثر حجم فایل ۲۰ مگابایته.", true);

  button.disabled = true;
  button.innerHTML = "<span>در حال ذخیره…</span>";
  message(msg, "");

  let path = type === "file" ? (old?.file_path || null) : null;
  let name = type === "file" ? (old?.file_name || null) : null;
  let uploaded = null;

  if (type === "file" && file) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "config.txt";
    uploaded = "configs/" + crypto.randomUUID() + "-" + safe;
    const { error } = await client.storage.from("v2ray-files").upload(uploaded, file, {
      contentType: file.type || "application/octet-stream"
    });
    if (error) {
      button.disabled = false;
      button.innerHTML = old ? "<span>ثبت تغییرات</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>" : "<span>ذخیره کانفیگ</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";
      return message(msg, "آپلود فایل ناموفق بود؛ دسترسی Storage رو بررسی کن.", true);
    }
    path = uploaded;
    name = file.name;
  }

  const payload = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    entry_type: type,
    config_text: type === "text" ? form.config_text.value.trim() : null,
    file_path: path,
    file_name: name,
    is_active: form.is_active.checked,
    updated_at: new Date().toISOString()
  };

  const result = old
    ? await client.from("v2ray_entries").update(payload).eq("id", id)
    : await client.from("v2ray_entries").insert({ id, ...payload });

  button.disabled = false;
  button.innerHTML = old ? "<span>ثبت تغییرات</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>" : "<span>ذخیره کانفیگ</span><svg class='ui-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='M19 12H5'/><path d='m12 19-7-7 7-7'/></svg>";

  if (result.error) {
    if (uploaded) await client.storage.from("v2ray-files").remove([uploaded]);
    return message(msg, "ذخیره انجام نشد؛ دسترسی مدیر یا اطلاعات ورودی رو بررسی کن.", true);
  }

  if (old?.file_path && old.file_path !== path) {
    await client.storage.from("v2ray-files").remove([old.file_path]);
  }

  resetEntry();
  toast("کانفیگ ذخیره شد.");
  loadDashboard();
});

async function updateStatus(id, status) {
  const client = await getSupabase();
  const { error } = await client.from("orders").update({ status }).eq("id", id);
  if (error) return toast("تغییر وضعیت درخواست انجام نشد.");
  toast("وضعیت درخواست به‌روز شد.");
  loadDashboard();
}

route();