import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Store,
  AlertCircle,
  Info,
  Check,
} from "lucide-react";

const BRAND = {
  yellow: "#F8C400",
  yellowDark: "#DFAE00",
  black: "#111318",
  text: "#2B2C40",
  muted: "#6E6B7B",
  border: "#DBDADE",
  soft: "#FFF7DB",
};

const LOGO_SRC = "/vivin-logo.png";
const HERO_SRC = "/vivin-login-hero-light.png";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "admin@vivinstore.com",
    password: "Admin@123",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await API.post("/api/auth/login", formData);

      const token =
        res.data?.token ||
        res.data?.accessToken ||
        res.data?.data?.token ||
        res.data?.data?.accessToken ||
        res.data?.admin?.token ||
        res.data?.user?.token;

      const user =
        res.data?.user ||
        res.data?.data?.user ||
        res.data?.admin ||
        res.data?.data?.admin ||
        {};

      if (!res.data?.success) {
        setError(res.data?.message || "Login failed. Please try again.");
        return;
      }

      if (!token) {
        console.error("Login response without token:", res.data);
        setError("Login success, but token not received from backend.");
        return;
      }

      const cleanToken = token.startsWith("Bearer ")
        ? token.replace("Bearer ", "")
        : token;

      localStorage.setItem("token", cleanToken);
      localStorage.setItem("user", JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem("remember_vivin_login", "true");
      } else {
        localStorage.removeItem("remember_vivin_login");
      }

      navigate("/super-admin/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{css}</style>

      <section className="hero-section" aria-label="Vivin Store supply chain illustration">
        {!heroError ? (
          <img
            src={HERO_SRC}
            alt="Vivin Store B2B supply chain platform"
            className="hero-img"
            onError={() => setHeroError(true)}
          />
        ) : (
          <div className="hero-fallback">
            <div className="brand-logo-large">
              {!logoError ? (
                <img
                  src={LOGO_SRC}
                  alt="Vivin Store"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Store size={44} />
              )}
            </div>
            <h2>Vivin Store</h2>
            <p>B2B Supply Chain Platform</p>
          </div>
        )}
      </section>

      <section className="form-section">
        <div className="mobile-brand">
          <div className="mobile-logo-box">
            {!logoError ? (
              <img
                src={LOGO_SRC}
                alt="Vivin Store"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Store size={26} />
            )}
          </div>
          <span>Vivin Store</span>
        </div>

        <main className="login-panel">
          <div className="title-area">
            <h1>Welcome to Vivin Store! <span>👋</span></h1>
            <p>
              Please sign in to your account and start managing your B2B supply
              chain operations.
            </p>
          </div>

          <div className="credential-note">
            <Info size={17} />
            <span>Email: admin@vivinstore.com / Pass: Admin@123</span>
          </div>

          {error && (
            <div className="error-box">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-box email-focus">
                <Mail size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@vivinstore.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-box">
                <Lock size={18} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-row">
                <button
                  type="button"
                  className={`check-box ${rememberMe ? "checked" : ""}`}
                  onClick={() => setRememberMe(!rememberMe)}
                  aria-label="Toggle remember me"
                >
                  {rememberMe && <Check size={13} strokeWidth={4} />}
                </button>
                <span>Remember me</span>
              </label>

              <button type="button" className="forgot-btn">
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="access-text">
            Need access to the platform? <button type="button">Contact administrator</button>
          </p>
        </main>
      </section>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: 'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #FFFFFF;
    color: ${BRAND.text};
  }

  button,
  input {
    font-family: inherit;
  }

  .login-page {
    width: 100%;
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1.46fr) minmax(430px, 0.94fr);
    background: #FFFFFF;
    overflow: hidden;
  }

  .hero-section {
    position: relative;
    min-height: 100vh;
    background: linear-gradient(135deg, #FFFFFF 0%, #F7F7FA 56%, #FFFFFF 100%);
    overflow: hidden;
  }

  .hero-img {
    width: 100%;
    height: 100%;
    min-height: 100vh;
    display: block;
    object-fit: cover;
    object-position: center center;
  }

  .hero-fallback {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 40px;
    background:
      radial-gradient(circle at 55% 42%, rgba(248,196,0,0.15), transparent 38%),
      linear-gradient(135deg, #FFFFFF, #F6F6F8);
  }

  .brand-logo-large {
    width: 118px;
    height: 118px;
    border-radius: 34px;
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 55px rgba(17, 19, 24, 0.12);
  }

  .brand-logo-large img {
    width: 104px;
    height: 104px;
    object-fit: contain;
  }

  .hero-fallback h2 {
    margin: 0;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.8px;
    color: ${BRAND.black};
  }

  .hero-fallback p {
    margin: 0;
    color: ${BRAND.muted};
    font-size: 16px;
    font-weight: 500;
  }

  .form-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 62px;
    background: #FFFFFF;
  }

  .login-panel {
    width: 100%;
    max-width: 482px;
  }

  .mobile-brand {
    display: none;
  }

  .title-area {
    margin-bottom: 26px;
  }

  .title-area h1 {
    margin: 0;
    font-size: 31px;
    line-height: 1.22;
    font-weight: 700;
    letter-spacing: -0.35px;
    color: ${BRAND.text};
  }

  .title-area h1 span {
    font-size: 25px;
  }

  .title-area p {
    margin: 12px 0 0;
    max-width: 430px;
    color: ${BRAND.muted};
    font-size: 17px;
    line-height: 1.52;
    font-weight: 400;
  }

  .credential-note {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 18px;
    margin: 0 0 28px;
    border-radius: 8px;
    background: #FFF5CF;
    color: #3D3729;
    font-size: 15px;
    font-weight: 500;
  }

  .credential-note svg {
    color: #6B5A1E;
    flex-shrink: 0;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 18px;
    border-radius: 7px;
    color: #B42318;
    background: #FEF3F2;
    border: 1px solid #FECDCA;
    font-size: 14px;
    font-weight: 500;
  }

  .login-form {
    width: 100%;
  }

  .input-group {
    margin-bottom: 24px;
  }

  .input-group label {
    display: block;
    margin-bottom: 10px;
    color: #4B465C;
    font-size: 14px;
    font-weight: 500;
  }

  .input-box {
    width: 100%;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 18px;
    border: 1.25px solid ${BRAND.border};
    border-radius: 7px;
    background: #FFFFFF;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .input-box svg {
    color: #7E7A8A;
    flex-shrink: 0;
  }

  .input-box:focus-within,
  .input-box.email-focus:focus-within {
    border-color: ${BRAND.yellow};
    box-shadow: 0 3px 12px rgba(248, 196, 0, 0.20);
  }

  .input-box input {
    flex: 1;
    height: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${BRAND.text};
    font-size: 16px;
    font-weight: 400;
  }

  .input-box input::placeholder {
    color: #B9B7C0;
  }

  .icon-btn {
    width: 34px;
    height: 34px;
    border: 0;
    background: transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 7px;
    transition: background 0.18s ease;
  }

  .icon-btn:hover {
    background: #F4F4F6;
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin: 2px 0 28px;
  }

  .remember-row {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #4B465C;
    font-size: 16px;
    font-weight: 400;
    cursor: pointer;
    user-select: none;
  }

  .check-box {
    width: 21px;
    height: 21px;
    border-radius: 5px;
    border: 1.5px solid #C9C7D0;
    background: #FFFFFF;
    color: ${BRAND.black};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
    padding: 0;
    flex-shrink: 0;
  }

  .check-box.checked {
    border-color: ${BRAND.yellow};
    background: ${BRAND.yellow};
    box-shadow: 0 3px 9px rgba(248, 196, 0, 0.30);
  }

  .forgot-btn,
  .access-text button {
    border: 0;
    padding: 0;
    background: transparent;
    color: ${BRAND.yellowDark};
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }

  .forgot-btn:hover,
  .access-text button:hover {
    text-decoration: underline;
  }

  .login-btn {
    width: 100%;
    height: 56px;
    border: 0;
    border-radius: 7px;
    background: ${BRAND.yellow};
    color: ${BRAND.black};
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(248, 196, 0, 0.28);
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  }

  .login-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 9px 24px rgba(248, 196, 0, 0.34);
  }

  .login-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }

  .access-text {
    margin: 28px 0 0;
    text-align: center;
    color: ${BRAND.muted};
    font-size: 16px;
    font-weight: 400;
  }

  @media (max-width: 1180px) {
    .login-page {
      grid-template-columns: 1fr 0.9fr;
    }

    .form-section {
      padding: 40px 42px;
    }
  }

  @media (max-width: 940px) {
    .login-page {
      grid-template-columns: 1fr;
      min-height: 100vh;
    }

    .hero-section {
      display: none;
    }

    .form-section {
      min-height: 100vh;
      padding: 34px 22px;
      background:
        radial-gradient(circle at top left, rgba(248,196,0,0.12), transparent 34%),
        #FFFFFF;
    }

    .login-panel {
      max-width: 520px;
    }

    .mobile-brand {
      position: fixed;
      top: 22px;
      left: 22px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: ${BRAND.black};
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.4px;
    }

    .mobile-logo-box {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 8px 25px rgba(17,19,24,0.08);
    }

    .mobile-logo-box img {
      width: 58px;
      height: 58px;
      object-fit: contain;
    }
  }

  @media (max-width: 520px) {
    .form-section {
      padding: 100px 20px 30px;
      align-items: flex-start;
    }

    .title-area h1 {
      font-size: 26px;
    }

    .title-area p,
    .credential-note,
    .input-box input,
    .remember-row,
    .forgot-btn,
    .access-text {
      font-size: 14px;
    }

    .credential-note {
      align-items: flex-start;
    }

    .form-options {
      align-items: flex-start;
      flex-direction: column;
      gap: 14px;
    }
  }
`;
