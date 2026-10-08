// Страница подтверждения почты: сюда ведёт ссылка из письма verify.html?token=…

const box = document.getElementById("verify");
const token = new URLSearchParams(location.search).get("token") || "";

// Убираем ключ из адресной строки и истории браузера
history.replaceState(null, "", "verify.html");

(async () => {
  if (!token) {
    box.innerHTML = `
      <h2 class="form-heading">Ссылка не работает</h2>
      <p>Ссылка неполная. Откройте её из письма целиком или запросите новое письмо в <a href="account.html">личном кабинете</a>.</p>`;
    return;
  }
  try {
    await confirmVerification(token);
    // Если человек уже вошёл — обновляем данные, чтобы сайт сразу узнал о подтверждении
    if (currentUser()) await doRefreshAuth();
    box.innerHTML = `
      <h2 class="form-heading">Почта подтверждена ✓</h2>
      <p>Спасибо! Теперь вы можете предлагать новые объекты и исправления.</p>
      <p><a class="button" href="${currentUser() ? "account.html" : "login.html"}">${currentUser() ? "В личный кабинет" : "Войти"}</a></p>`;
  } catch (error) {
    box.innerHTML = `
      <h2 class="form-heading">Не получилось подтвердить</h2>
      <p class="form-error">${escapeHtml(error.message)}</p>
      <p>Новое письмо можно запросить в <a href="account.html">личном кабинете</a>.</p>`;
  }
})();
