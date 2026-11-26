document.addEventListener("DOMContentLoaded", async () => {
  const db = window.CacaoDB;
  const adminMode = Boolean(document.querySelector("#admin-auth-form"));
  const form = document.querySelector(adminMode ? "#admin-auth-form" : "#customer-auth-form");
  const message = document.querySelector("#auth-message");
  let mode = "signin";

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  async function getSignedInProfile() {
    const session = await db.getSession();
    return session ? { session, profile: await db.getProfile(session.user.id) } : null;
  }

  function showCustomerAccount(session, profile) {
    document.querySelector("#auth-title").textContent = `Hello, ${profile.display_name || "chocolate lover"}.`;
    document.querySelector("#auth-subtitle").textContent = "Lovely to have you back.";
    form.classList.add("is-hidden");
    document.querySelector(".auth-tabs").classList.add("is-hidden");
    const panel = document.querySelector("#account-panel");
    panel.classList.remove("is-hidden");
    document.querySelector("#account-email").textContent = session.user.email;
    document.querySelector("#account-avatar").textContent = (profile.display_name || session.user.email || "C").slice(0, 1).toUpperCase();
  }

  async function submitCustomer(event) {
    event.preventDefault();
    const values = new FormData(form);
    const email = String(values.get("email")).trim();
    const password = String(values.get("password"));
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    showMessage("");
    try {
      if (mode === "signup") {
        const displayName = String(values.get("displayName")).trim();
        if (!displayName) throw new Error("Please add your name.");
        const result = await db.signUp(email, password, displayName);
        if (result.error) throw result.error;
        if (!result.data.session) {
          showMessage("Check your inbox to confirm your email, then sign in.");
          form.reset();
          return;
        }
        showMessage("Your account is ready. Welcome to the good stuff.");
      } else {
        const result = await db.signIn(email, password);
        if (result.error) throw result.error;
      }
      const signedIn = await getSignedInProfile();
      if (!signedIn) throw new Error("Your sign-in finished, but no session was returned. Please try again.");
      if (signedIn.profile.role === "admin") {
        location.href = "admin.html";
        return;
      }
      form.reset();
      showCustomerAccount(signedIn.session, signedIn.profile);
    } catch (error) {
      showMessage(error.message || "We couldn't sign you in. Please try again.", true);
    } finally {
      submit.disabled = false;
    }
  }

  if (!db.configured) {
    showMessage("Add your Supabase URL and publishable key to supabase-config.js, then run database.sql.", true);
  } else {
    try {
      const signedIn = await getSignedInProfile();
      if (adminMode && signedIn?.profile.role === "admin") {
        location.href = "admin.html";
        return;
      }
      if (!adminMode && signedIn) showCustomerAccount(signedIn.session, signedIn.profile);
    } catch (error) {
      showMessage(`Couldn't load your account: ${error.message}`, true);
    }
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      if (adminMode) {
        event.preventDefault();
        (async () => {
          const submit = form.querySelector('[type="submit"]');
          const values = new FormData(form);
          submit.disabled = true;
          showMessage("");
          try {
            const result = await db.signIn(String(values.get("email")).trim(), String(values.get("password")));
            if (result.error) throw result.error;
            const profile = await db.getProfile(result.data.user.id);
            if (profile.role !== "admin") {
              await db.signOut();
              throw new Error("This account doesn't have store administrator access.");
            }
            location.href = "admin.html";
          } catch (error) {
            showMessage(error.message || "We couldn't sign you in. Please try again.", true);
          } finally {
            submit.disabled = false;
          }
        })();
      } else {
        submitCustomer(event);
      }
    });
  }

  if (!adminMode) {
    document.querySelectorAll("[data-auth-mode]").forEach((tab) => {
      tab.addEventListener("click", () => {
        mode = tab.dataset.authMode;
        document.querySelectorAll("[data-auth-mode]").forEach((item) => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });
        const signup = mode === "signup";
        document.querySelector(".auth-name-field").classList.toggle("is-hidden", !signup);
        form.elements.displayName.required = signup;
        form.elements.password.autocomplete = signup ? "new-password" : "current-password";
        document.querySelector("#auth-title").textContent = signup ? "A sweet hello." : "Welcome back.";
        document.querySelector("#auth-subtitle").textContent = signup ? "Make an account for the good stuff." : "Sign in to find your favorites waiting.";
        document.querySelector("#auth-submit-label").textContent = signup ? "Create your account" : "Sign in";
        showMessage("");
      });
    });

    document.querySelector("#customer-signout").addEventListener("click", async () => {
      try {
        const result = await db.signOut();
        if (result.error) throw result.error;
        location.reload();
      } catch (error) {
        showMessage(`Couldn't sign out: ${error.message}`, true);
      }
    });
  }
  if (window.CacaoStore) window.CacaoStore.initSite();
});
