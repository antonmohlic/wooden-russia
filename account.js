// Личный кабинет: профиль, смена пароля, выход.
// Заявки участника и модерация появятся здесь на следующих шагах.

const root = document.getElementById("account");

function formatDate(value) {
  return value ? new Date(value.replace(" ", "T")).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
}

function render(user) {
  root.innerHTML = `
    <h1>Личный кабинет</h1>

    ${
      user.verified
        ? ""
        : `<section class="panel panel--notice" id="verify-notice">
             <h2>Подтвердите почту</h2>
             <p>Мы отправили письмо со ссылкой на <strong>${escapeHtml(user.email)}</strong>.
                Пока почта не подтверждена, предлагать объекты нельзя, а через сутки неподтверждённый аккаунт удаляется.</p>
             <p class="form-hint">Не видите письма? Проверьте папку «Спам» или отправьте его ещё раз.</p>
             <p><button class="button button--secondary" type="button" id="resend-verification">Отправить письмо ещё раз</button></p>
             <p class="form-success" hidden>Письмо отправлено.</p>
             <p class="form-error" role="alert" hidden></p>
           </section>`
    }

    <section class="panel">
      <h2>Профиль</h2>
      <dl class="facts">
        <dt>Почта</dt><dd>${escapeHtml(user.email)} ${user.verified ? "✓ подтверждена" : "— не подтверждена"}</dd>
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
             <p class="form-hint">Новых заявок от участников: <strong id="pending-total">…</strong></p>
             <p><a class="button" href="moderate.html">Открыть очередь модерации</a></p>
           </section>`
        : ""
    }

    <section class="panel" id="submissions">
      <h2>Мои предложения</h2>
      <p class="form-success" id="sent-message" hidden>Заявка отправлена на модерацию. Статус будет виден здесь.</p>
      <p class="form-hint">
        Чтобы предложить исправление, откройте страницу объекта и нажмите «Предложить правку».
      </p>
      ${
        user.verified
          ? `<p><a class="button" href="propose.html">+ Предложить новый объект</a></p>`
          : `<p class="form-hint">Предлагать объекты можно после подтверждения почты.</p>`
      }
      <div id="submissions-list"><p class="form-hint">Загрузка…</p></div>
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

  // «Отправить письмо ещё раз» для неподтверждённой почты
  const resend = document.getElementById("resend-verification");
  if (resend) {
    const notice = document.getElementById("verify-notice");
    resend.addEventListener("click", async () => {
      notice.querySelector(".form-success").hidden = true;
      notice.querySelector(".form-error").hidden = true;
      resend.disabled = true;
      try {
        await requestVerification(user.email);
        notice.querySelector(".form-success").hidden = false;
      } catch (e) {
        notice.querySelector(".form-error").textContent = e.message;
        notice.querySelector(".form-error").hidden = false;
      }
      // Не даём слать письма слишком часто
      setTimeout(() => (resend.disabled = false), 60000);
    });
  }

  if (new URLSearchParams(location.search).get("sent")) {
    document.getElementById("sent-message").hidden = false;
    history.replaceState(null, "", "account.html#submissions");
  }
  loadSubmissions();

  if (user.role === "admin") {
    api("GET", `/api/collections/submissions/records?filter=${encodeURIComponent('status = "pending"')}&perPage=1&fields=id`)
      .then((result) => (document.getElementById("pending-total").textContent = result.totalItems))
      .catch(() => (document.getElementById("pending-total").textContent = "?"));
  }
}

// ---------- Мои заявки ----------

const KIND_LABELS = { create: "Новый объект", update: "Правка", delete: "Удаление" };
const SUBMISSION_STATUS = {
  pending: { label: "на модерации", color: "#b45f00" },
  approved: { label: "принята", color: "#2e7d32" },
  rejected: { label: "отклонена", color: "#8a1c12" },
};

function submissionHtml(sub, objectsBySlug) {
  const status = SUBMISSION_STATUS[sub.status] || { label: sub.status, color: "#555" };
  const target = objectsBySlug.get(sub.target);
  const name = sub.data?.name || target?.name || sub.target_name || sub.target || "без названия";
  const changed = sub.kind === "update" ? Object.keys(sub.data || {}).length : 0;
  return `
    <article class="submission">
      <div class="submission-head">
        <span class="status" style="background:${status.color}">${status.label}</span>
        <strong>${KIND_LABELS[sub.kind] || sub.kind}:</strong>
        ${target ? `<a href="${objectUrl(target)}">${escapeHtml(name)}</a>` : escapeHtml(name)}
      </div>
      <p class="submission-meta">
        отправлена ${escapeHtml(formatDate(sub.created))}${changed ? ` · изменено полей: ${changed}` : ""}
      </p>
      ${sub.comment ? `<p class="submission-text">Ваш комментарий: ${escapeHtml(sub.comment)}</p>` : ""}
      ${sub.admin_comment ? `<p class="submission-text submission-text--admin">Модератор: ${escapeHtml(sub.admin_comment)}</p>` : ""}
      ${sub.status === "pending" ? `<button class="link-button" type="button" data-withdraw="${escapeHtml(sub.id)}">Отозвать заявку</button>` : ""}
    </article>`;
}

async function loadSubmissions() {
  const list = document.getElementById("submissions-list");
  try {
    const filter = encodeURIComponent(`author = "${currentUser().id}"`);
    const [result, objects] = await Promise.all([
      api("GET", `/api/collections/submissions/records?filter=${filter}&sort=-created&perPage=200`),
      loadObjects(),
    ]);
    const objectsBySlug = new Map(objects.map((o) => [o.id, o]));
    list.innerHTML = result.items.length
      ? result.items.map((sub) => submissionHtml(sub, objectsBySlug)).join("")
      : `<p class="form-hint">Вы пока ничего не предлагали.</p>`;
  } catch (e) {
    list.innerHTML = `<p class="form-error">${escapeHtml(e.message)}</p>`;
  }

  list.querySelectorAll("[data-withdraw]").forEach((button) =>
    button.addEventListener("click", async () => {
      if (!confirm("Отозвать заявку? Её нельзя будет вернуть.")) return;
      try {
        await api("DELETE", `/api/collections/submissions/records/${button.dataset.withdraw}`);
        loadSubmissions();
      } catch (e) {
        alert(e.message);
      }
    })
  );
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
