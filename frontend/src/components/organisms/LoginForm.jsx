import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { strings } from "../../strings/pt-BR.js";
import { loginRequest } from "../../services/authApi.js";
import { Button } from "../atoms/Button.jsx";
import { FormField } from "../molecules/FormField.jsx";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginRequest({ user_name: username.trim(), password });
      const from = location.state?.from && typeof location.state.from === "string" ? location.state.from : "/";
      navigate(from === "/login" ? "/" : from, { replace: true });
    } catch (err) {
      const status = /** @type {{ status?: number }} */ (err).status;
      if (status === 401) {
        setError(strings.loginErrorInvalid);
      } else {
        setError(strings.loginErrorNetwork);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="fm-login" onSubmit={handleSubmit} noValidate>
      <section className="fm-card fm-login__card">
        {error ? (
          <p className="fm-login__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="fm-login__fields">
          <FormField
            id="login-username"
            name="username"
            label={strings.loginUsernameLabel}
            placeholder={strings.loginUsernamePlaceholder}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <FormField
            id="login-password"
            name="password"
            type="password"
            label={strings.loginPasswordLabel}
            placeholder={strings.loginPasswordPlaceholder}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="fm-login__actions">
          <Button type="submit" className="fm-login__submit" disabled={loading}>
            {loading ? strings.loginSubmitting : strings.loginSubmit}
          </Button>
        </div>
      </section>
    </form>
  );
}
