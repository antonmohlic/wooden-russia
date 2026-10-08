// Страница «Новый пароль»: сюда ведёт ссылка из письма reset.html?token=…

const token = new URLSearchParams(location.search).get("token") || "";
const form = document.getElementById("reset-form");

// Убираем ключ из адресной строки и истории браузера, чтобы его не увидели через плечо
history.replaceState(null, "", "reset.html");

if (!token) {
  form.hidden = true;
  document.getElementById("reset-invalid").hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorBox = form.querySelector(".form-error");
  const button = form.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(form));
  errorBox.hidden = true;

  if (data.password !== data.passwordConfirm) {
    errorBox.textContent = "Пароли не совпадают.";
    errorBox.hidden = false;
    return;
  }

  button.disabled = true;
  try {
    await confirmPasswordReset(token, data.password, data.passwordConfirm);
    // Старые сессии после смены пароля недействительны — выходим и здесь
    logout();
    form.hidden = true;
    document.getElementById("reset-done").hidden = false;
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    button.disabled = false;
  }
});
