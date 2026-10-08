// Связь с сервером (PocketBase): объекты, вход, регистрация, сессия.
// Подключается на каждой странице перед common.js.

// Где находится сервер. При локальной разработке сайт и PocketBase работают на разных портах,
// на настоящем сервере — по одному адресу, поэтому там путь относительный.
const API_URL = (() => {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  return local && location.port !== "8090" ? "http://127.0.0.1:8090" : "";
})();

const AUTH_STORAGE_KEY = "wooden-russia-auth";

// ---------- Хранение сессии в браузере ----------

function readStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function storeAuth(auth) {
  try {
    if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Хранилище недоступно (например, приватный режим) — сессия проживёт до перезагрузки
  }
}

let currentAuth = readStoredAuth();

function currentUser() {
  return currentAuth ? currentAuth.record : null;
}

function isSiteAdmin() {
  return currentUser()?.role === "admin";
}

// ---------- Запросы к серверу ----------

// Ошибка сервера с понятным текстом на русском
class ApiError extends Error {
  constructor(status, body) {
    super(translateError(status, body));
    this.status = status;
    this.body = body;
  }
}

const FIELD_ERRORS = {
  validation_not_unique: "уже занято",
  validation_is_email: "неверный адрес почты",
  validation_invalid_email: "неверный адрес почты",
  validation_required: "обязательное поле",
  validation_values_mismatch: "не совпадает",
  validation_length_out_of_range: "неверная длина",
  validation_min_text_constraint: "слишком коротко",
  validation_max_text_constraint: "слишком длинно",
  validation_invalid_old_password: "неверный текущий пароль",
};

const FIELD_NAMES = {
  email: "Почта",
  password: "Пароль",
  passwordConfirm: "Повтор пароля",
  oldPassword: "Текущий пароль",
  name: "Имя",
};

function translateError(status, body) {
  if (status === 0) return "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.";
  if (status === 429) return "Слишком много попыток. Подождите немного и попробуйте снова.";
  const fields = body && body.data ? Object.entries(body.data) : [];
  if (fields.length) {
    return fields
      .map(([field, error]) => {
        if (field === "email" && error.code === "validation_not_unique") return "Эта почта уже зарегистрирована.";
        if (field === "password" && /length|min_text/.test(error.code)) return "Пароль должен быть не короче 8 символов.";
        if (field === "passwordConfirm") return "Пароли не совпадают.";
        return `${FIELD_NAMES[field] || field}: ${FIELD_ERRORS[error.code] || error.message}`;
      })
      .join(" ");
  }
  if (status === 400 && body && /authenticate/i.test(body.message || "")) return "Неверная почта или пароль.";
  if (status === 403) return "Недостаточно прав для этого действия.";
  if (status === 404) return "Не найдено.";
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (currentAuth) headers.Authorization = currentAuth.token;
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

// ---------- Вход и регистрация ----------

async function login(email, password) {
  const result = await api("POST", "/api/collections/users/auth-with-password", { identity: email, password });
  currentAuth = { token: result.token, record: result.record };
  storeAuth(currentAuth);
  return currentAuth.record;
}

async function register(name, email, password, passwordConfirm) {
  await api("POST", "/api/collections/users/records", { name, email, password, passwordConfirm });
  return login(email, password);
}

function logout() {
  currentAuth = null;
  storeAuth(null);
}

// Проверяет, что сохранённая сессия ещё действует, и обновляет данные пользователя (например, роль).
// На странице выполняется один раз, сколько бы мест её ни вызывало.
let refreshPromise = null;

function refreshAuth() {
  if (!refreshPromise) refreshPromise = doRefreshAuth();
  return refreshPromise;
}

async function doRefreshAuth() {
  if (!currentAuth) return null;
  try {
    const result = await api("POST", "/api/collections/users/auth-refresh");
    currentAuth = { token: result.token, record: result.record };
    storeAuth(currentAuth);
  } catch (error) {
    // Сессия истекла или пользователь удалён; при отсутствии связи — оставляем как есть
    if (error.status === 401 || error.status === 403 || error.status === 404) logout();
  }
  return currentUser();
}

async function updateProfile(fields) {
  const record = await api("PATCH", `/api/collections/users/records/${currentUser().id}`, fields);
  currentAuth = { ...currentAuth, record };
  storeAuth(currentAuth);
  return record;
}

// ---------- Объекты ----------

// Запись из базы → объект в том виде, к которому привык остальной код сайта
function fromRecord(record) {
  const obj = { ...record, id: record.slug, recordId: record.id };
  delete obj.slug;
  // Пустые числовые поля база отдаёт как 0 — превращаем в «нет значения»
  for (const key of ["year", "century", "founded"]) {
    if (!obj[key]) obj[key] = null;
  }
  return obj;
}

async function fetchObjectsFromServer() {
  const objects = [];
  for (let page = 1; ; page++) {
    const result = await api("GET", `/api/collections/objects/records?perPage=500&page=${page}&sort=name`);
    objects.push(...result.items.map(fromRecord));
    if (page >= result.totalPages) break;
  }
  return objects;
}

// Работает ли сервер. Если нет (например, сайт открыт на GitHub Pages) — сайт читает data/objects.json
// и прячет вход и личный кабинет.
let serverCheck = null;

function checkServer() {
  if (!serverCheck) {
    serverCheck = api("GET", "/api/health").then(
      () => true,
      () => false
    );
  }
  return serverCheck;
}
