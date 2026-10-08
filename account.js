// Личный кабинет: профиль, смена пароля, выход.
// Заявки участника и модерация появятся здесь на следующих шагах.

const root = document.getElementById("account");

function formatDate(value) {
  return value ? new Date(value.replace(" ", "T")).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
}

function render(user) {
  root.innerHTML = `
    <h1>Личный кабинет</h1>

    <section class="panel">
      <h2>Профиль</h2>
      <dl class="facts">
        <dt>Почта</dt><dd>${escapeHtml(user.email)}</dd>
        <dt>Роль</dt><dd>${user.role === "admin" ? "администратор" : "участник"}</dd>
        <dt>С нами с</dt><dd>${escapeHtml(formatDate(user.created))}</dd>
      </dl>

      <form class="form form--inline" id="name-form">
        <label>Имя
          <input type="text" name="name" value="${escapeHtml(user.name)}" maxlength="255" required>
        </label>
        <button class="button" type="submit">Сохранить</button>
        <p class="form-error" role="alert" hidden></p>
        <p class="form-success" hidden>Сохранено.</p>
      </form>
    </section>

    ${
      user.role === "admin"
        ? `<section class="panel">
             <h2>Модерация</h2>
             <p class="form-hint">Очередь предложений от участников появится здесь на следующем этапе.</p>
           </section>`
        : ""
    }

    <section class="panel">
      <h2>Мои предложения</h2>
      <p class="form-hint">Скоро здесь можно будет предложить новый объект или исправление и следить за статусом.</p>
    </section>

    <section class="panel">
      <h2>Смена пароля</h2>
      <form class="form" id="password-form">
        <label>Текущий пароль
          <input type="password" name="oldPassword" autocomplete="current-password" required>
        </label>
        <label>Новый пароль (не короче 8 символов)
          <input type="password" name="password" autocomplete="new-password" minlength="8" required>
        </label>
        <label>Повторите новый пароль
          <input type="password" name="passwordConfirm" autocomplete="new-password" minlength="8" required>
        </label>
        <p class="form-error" role="alert" hidden></p>
        <button class="button" type="submit">Сменить пароль</button>
      </form>
    </section>

    <button class="button button--secondary" type="button" id="logout">Выйти</button>`;

  // Имя
  const nameForm = document.getElementById("name-form");
  nameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = nameForm.querySelector(".form-error");
    const success = nameForm.querySelector(".form-success");
    error.hidden = success.hidden = true;
    try {
      await updateProfile({ name: nameForm.elements.name.value.trim() });
      success.hidden = false;
      document.querySelector(".account-link a").textContent = `👤 ${currentUser().name || currentUser().email}`;
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    }
  });

  // Пароль. После смены сервер завершает все сессии, поэтому входим заново новым паролем.
  const passwordForm = document.getElementById("password-form");
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = passwordForm.querySelector(".form-error");
    error.hidden = true;
    const data = Object.fromEntries(new FormData(passwordForm));
    try {
      if (data.password !== data.passwordConfirm) throw new Error("Новые пароли не совпадают.");
      const email = currentUser().email;
      await updateProfile(data);
      await login(email, data.password);
      passwordForm.reset();
      alert("Пароль изменён.");
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    }
  });

  document.getElementById("logout").addEventListener("click", () => {
    logout();
    location.href = "index.html";
  });
}

(async () => {
  if (!(await checkServer())) {
    root.innerHTML = `<h1>Личный кабинет</h1><p>Сейчас нет связи с сервером. Попробуйте позже.</p>`;
    return;
  }
  const user = await refreshAuth();
  if (!user) {
    location.replace("login.html?next=account.html");
    return;
  }
  render(user);
})();
