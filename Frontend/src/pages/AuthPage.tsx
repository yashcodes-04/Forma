import { FormEvent, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../api/client";
import "../auth.css";

type AuthMode = "login" | "register";

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MailIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ verticalAlign: "middle", marginRight: "6px" }}>
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginCustomer, registerCustomer, isAuthenticated } = useAuth();
  
  const isRegister = mode === "register";
  
  // Form fields
  const [mobile, setMobile] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  
  // State
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetDestination, setTargetDestination] = useState("");

  // If already logged in, redirect to destination
  useEffect(() => {
    if (isAuthenticated) {
      const nextPath = searchParams.get("next") || "/";
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  // Resend countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  /**
   * Request OTP code - Dispatches 6-digit code to user's Email inbox
   */
  const handleSendOtp = async () => {
    setError("");
    setNotice("");
    const cleanMobile = mobile.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number (starts with 6-9).");
      return;
    }

    if (isRegister && !email) {
      setError("Please enter your email address. Verification code will be sent to your email inbox.");
      return;
    }

    setIsSubmitting(true);
    const purpose = isRegister ? "register" : "login";

    const res = await authApi.sendOtp({
      mobile: cleanMobile,
      email: email ? email.trim() : undefined,
      purpose,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to send verification code.");
      return;
    }

    setOtpSent(true);
    setResendTimer(30);
    setOtp("");
    
    const dest = (res as { maskedEmail?: string }).maskedEmail || email || cleanMobile;
    setTargetDestination(dest);

    setNotice(
      res.message ||
      `Verification code dispatched to your registered email (${dest}). Valid for 5 minutes.`
    );
  };

  /**
   * Submit 6-digit OTP to verify and sign in / register
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanMobile = mobile.replace(/\D/g, "");
    const nextPath = searchParams.get("next") || "/";

    if (!otpSent) {
      await handleSendOtp();
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        // Complete Registration
        const res = await registerCustomer({
          firstName,
          lastName,
          mobile: cleanMobile,
          email: email ? email.trim() : undefined,
          otp: otp.trim(),
        });

        if (res.success) {
          navigate(nextPath, { replace: true });
        } else {
          setError(res.error || "Registration failed. Please verify the code.");
        }
      } else {
        // Complete Login
        const res = await loginCustomer({
          mobile: cleanMobile,
          otp: otp.trim(),
        });

        if (res.success) {
          navigate(nextPath, { replace: true });
        } else {
          setError(res.error || "Sign in failed. Please verify your verification code.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1585131552878-bbfcbd998d57?auto=format&fit=crop&w=1400&q=88"
          alt="Forma luxury architectural visual"
        />
        <div className="auth-visual-overlay" />
        <Link className="auth-wordmark auth-wordmark-light" to="/">
          FORMA<span>®</span>
        </Link>
        <div className="auth-caption">
          <p>Customer Access / Security</p>
          <h2>Direct authentication.</h2>
          <span>
            Instant access with one-time security passcodes delivered securely to your
            email inbox. No password hassle.
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <header className="auth-mobile-header">
          <Link className="auth-wordmark" to="/">
            FORMA<span>®</span>
          </Link>
          <Link to="/">Close</Link>
        </header>

        <div className="auth-form-wrap">
          <div className="auth-heading">
            <p>{isRegister ? "Create an account" : "Customer Sign In"}</p>
            <h1>{isRegister ? "Join Forma." : "Sign in."}</h1>
            <span>
              {isRegister
                ? "Enter your details. Your 6-digit verification code will be sent to your email inbox."
                : "Enter your registered mobile number and we'll send a 6-digit code to your email."}
            </span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="auth-name-row">
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Aarav"
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    required
                  />
                </label>
              </div>
            )}

            {isRegister && (
              <label>
                Email address (OTP sent here)
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  disabled={otpSent}
                  required
                />
              </label>
            )}

            <label>
              Mobile number
              <div className="mobile-field">
                <span>+91</span>
                <input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}
                  disabled={otpSent}
                  required
                />
                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError("");
                      setNotice("");
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
            </label>

            {otpSent && (
              <div className="otp-container">
                <label>
                  <div className="otp-label-row">
                    <span>
                      <MailIcon /> Enter 6-digit code from email
                    </span>
                  </div>
                  <input
                    className="otp-input"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                  />
                </label>

                <div className="resend-row">
                  {resendTimer > 0 ? (
                    <span className="resend-timer">
                      Resend code in <strong>{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="resend-link"
                      onClick={handleSendOtp}
                    >
                      Resend Email Code
                    </button>
                  )}
                </div>
              </div>
            )}

            {isRegister && (
              <label className="consent-field">
                <input type="checkbox" defaultChecked required />
                <span>
                  I agree to the <a href="#terms">Terms of Service</a> and{" "}
                  <a href="#privacy">Privacy Policy</a>.
                </span>
              </label>
            )}

            {error && (
              <div className="auth-message auth-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="auth-message auth-notice" role="status">
                <CheckIcon /> {notice}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? "Verifying..."
                  : isRegister
                  ? otpSent
                    ? "Verify & Create Account"
                    : "Send Email Code"
                  : otpSent
                  ? "Verify & Continue"
                  : "Send Code to Email"}
              </span>
              <ArrowIcon />
            </button>
          </form>

          <div className="auth-switch">
            <span>{isRegister ? "Already a Forma member?" : "New to Forma?"}</span>
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in to account" : "Create a free profile"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
