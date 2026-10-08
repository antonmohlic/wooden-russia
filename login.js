// Страница «Вход и регистрация»

// Куда вернуть пользователя после входа: login.html?next=… или в личный кабинет.
// Разрешаем только страницы нашего сайта, чтобы ссылкой нельзя было увести на чужой.
function nextPage() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[a-z-]+\.html(\?[^#]*)?$/.test(next) ? next : "account.html";
}

if (currentUser()) location.replace(nextPage());

// Переключение вкладок «Вход» / «Регистрация»
function showTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => (panel.hidden = panel.dataset.panel !== name));
}

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
if (location.hash === "#register") showTab("register");

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

checkServer().then((available) => {
  if (available) return;
  document.querySelectorAll("form").forEach((form) => (form.hidden = true));
  document.querySelector(".tabs").hidden = true;
  document.getElementById("server-down").hidden = false;
});
