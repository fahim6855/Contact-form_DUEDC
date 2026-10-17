import { useRef, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FIELDS = [
  { name: "fullName", label: "Full name", placeholder: "Your full name", type: "text", autoComplete: "name" },
  { name: "companyName", label: "Company name", placeholder: "Your company name", type: "text", autoComplete: "organization" },
  { name: "email", label: "Email", placeholder: "Your email address", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", placeholder: "Your phone number", type: "tel", autoComplete: "tel" },
];

const INITIAL = { fullName: "", companyName: "", email: "", phone: "", consent: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the Edge Function, so users get instant feedback.
function validate(v) {
  const e = {};
  if (v.fullName.trim().length < 2) e.fullName = "Enter your full name.";
  if (!v.companyName.trim()) e.companyName = "Enter your company name.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  const digits = v.phone.replace(/\D/g, "");
  if (!v.phone.trim()) e.phone = "Enter your phone number.";
  else if (digits.length < 7 || digits.length > 15) e.phone = "Enter a valid phone number.";
  if (!v.consent) e.consent = "Tick the box to agree to the privacy policy.";
  return e;
}

export default function App() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", message }
  const firstInput = useRef(null);

  function update(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const { [name]: _removed, ...rest } = e;
      return rest;
    });
    setStatus(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    if (!SUPABASE_URL) {
      setStatus({ type: "error", message: "VITE_SUPABASE_URL is not set. Add it to your .env file." });
      return;
    }

    const found = validate(values);
    if (Object.keys(found).length) {
      setErrors(found);
      setStatus({ type: "error", message: "Fix the highlighted fields and try again." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SUPABASE_ANON_KEY && {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          }),
        },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setValues(INITIAL); // clear the form
        setErrors({});
        setStatus({ type: "success", message: data.message });
      } else {
        setErrors(data?.errors || {});
        setStatus({ type: "error", message: data?.message || "Something went wrong. Try again in a moment." });
      }
    } catch {
      setStatus({ type: "error", message: "Could not reach the server. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <div className="dots" aria-hidden="true">
        <span /><span /><span />
      </div>

      <section className="intro">
        <div>
          <h1>Meet with Cameron</h1>
          <p className="lead">
            Let us show you how Cypulse can transform the way you govern and share your sensitive data.
          </p>
          <div className="person">
            <img src="/cameron.svg" alt="Cameron Williamson" width="40" height="40" />
            <div>
              <strong>Cameron Williamson</strong>
              <span>Sales Manager</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="chat"
          aria-label="Chat with Cameron"
          onClick={() => firstInput.current?.focus()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z" />
          </svg>
        </button>
      </section>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {FIELDS.map((f, i) => (
          <div className="field" key={f.name}>
            <label htmlFor={f.name}>
              {f.label} <span aria-hidden="true">*</span>
            </label>
            <input
              id={f.name}
              ref={i === 0 ? firstInput : undefined}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={values[f.name]}
              onChange={(e) => update(f.name, e.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors[f.name])}
              aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
              disabled={loading}
            />
            {errors[f.name] && <p className="error" id={`${f.name}-error`}>{errors[f.name]}</p>}
          </div>
        ))}

        <div className="actions">
          <label className="consent">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(e) => update("consent", e.target.checked)}
              aria-invalid={Boolean(errors.consent)}
              disabled={loading}
            />
            <span>I agree that my personal data will be processed in accordance with the privacy policy.</span>
          </label>
          <button type="submit" className="send" disabled={loading} aria-busy={loading}>
            {loading ? (<><i className="spinner" aria-hidden="true" />Sending…</>) : "Send Message"}
          </button>
        </div>

        {errors.consent && <p className="error">{errors.consent}</p>}
        {status && (
          <p className={`status ${status.type}`} role={status.type === "error" ? "alert" : "status"}>
            {status.message}
          </p>
        )}
      </form>
    </main>
  );
}
