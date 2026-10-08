// Страница «Вход и регистрация»

// Куда вернуть пользователя после входа: login.html?next=… или в личный кабинет.
// Разрешаем только страницы нашего сайта, чтобы ссылкой нельзя было увести на чужой.
function nextPage() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[a-z-]+\.html(\?[^#]*)?$/.test(next) ? next : "account.html";
}

if (currentUser()) location.replace(nextPage());

// Переключение вкладок «Вход» / «Регистрация» и формы «Забыли пароль?»
function showTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => (panel.hidden = panel.dataset.panel !== name));
  // Вкладки над формой восстановления не нужны
  document.querySelector(".tabs").hidden = name === "forgot";
}

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
document.querySelectorAll("[data-show]").forEach((link) => link.addEventListener("click", () => showTab(link.dataset.show)));
if (location.hash === "#register") showTab("register");
if (location.hash === "#forgot") showTab("forgot");

// Общая обработка отправки формы: блокируем кнопку, показываем ошибку по-русски
function handleForm(form, action) {
  const errorBox = form.querySelector(".form-error");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    button.disabled = true;
    try {
      await action(Object.fromEntries(new FormData(form)));
      location.href = nextPage();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
    }
  });
}

handleForm(document.getElementById("login-form"), (data) => login(data.email.trim(), data.password));

handleForm(document.getElementById("register-form"), (data) => {
  if (data.password !== data.passwordConfirm) throw new Error("Пароли не совпадают.");
  return register(data.name.trim(), data.email.trim(), data.password, data.passwordConfirm);
});

// «Забыли пароль?»: сервер отвечает одинаково, есть такая почта или нет,
// чтобы по форме нельзя было выяснить, кто зарегистрирован
const forgotForm = document.getElementById("forgot-form");
forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorBox = forgotForm.querySelector(".form-error");
  const success = forgotForm.querySelector(".form-success");
  const button = forgotForm.querySelector("button[type=submit]");
  errorBox.hidden = success.hidden = true;
  button.disabled = true;
  try {
    await requestPasswordReset(forgotForm.elements.email.value.trim());
    success.hidden = false;
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }
  button.disabled = false;
});

checkServer().then((available) => {
  if (available) return;
  document.querySelectorAll("form").forEach((form) => (form.hidden = true));
  document.querySelector(".tabs").hidden = true;
  document.getElementById("server-down").hidden = false;
});
