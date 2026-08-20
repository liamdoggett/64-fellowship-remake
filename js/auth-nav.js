import { getSessionWhenReady, signOut } from "./supabase-client.js";
import { isAdmin } from "./profiles.js";

/**
 * Keep the site header in sync with auth state on every page.
 */
export async function syncAuthNav() {
  const nav = document.querySelector(".nav-links");
  if (!nav) return null;

  const session = await getSessionWhenReady();
  const signedIn = Boolean(session?.user);
  const admin = signedIn && isAdmin(session.user);

  nav.querySelectorAll("[data-auth-injected]").forEach((el) => el.remove());

  const guestLogin = nav.querySelector('a[href="login.html"]:not([data-auth-keep])');
  const guestJoin = [...nav.querySelectorAll("a.nav-cta")].find(
    (a) => a.getAttribute("href")?.includes("join") || a.getAttribute("href")?.includes("contact")
  );
  const membersLink = nav.querySelector('a[href="members.html"]');
  const existingSignOut = nav.querySelector("#sign-out-btn, [data-sign-out]");

  if (signedIn) {
    if (guestLogin) guestLogin.hidden = true;
    if (guestJoin) guestJoin.hidden = true;

    if (!membersLink) {
      const link = document.createElement("a");
      link.href = "members.html";
      link.textContent = "Members";
      link.dataset.authInjected = "true";
      if (location.pathname.endsWith("members.html")) {
        link.setAttribute("aria-current", "page");
      }
      nav.appendChild(link);
    } else {
      membersLink.hidden = false;
    }

    const existingCrm = nav.querySelector('a[href="crm.html"]');
    if (admin) {
      if (!existingCrm) {
        const crmLink = document.createElement("a");
        crmLink.href = "crm.html";
        crmLink.textContent = "CRM";
        crmLink.dataset.authInjected = "true";
        if (location.pathname.endsWith("crm.html")) {
          crmLink.setAttribute("aria-current", "page");
        }
        const membersAnchor = nav.querySelector('a[href="members.html"]');
        if (membersAnchor?.nextSibling) {
          nav.insertBefore(crmLink, membersAnchor.nextSibling);
        } else if (membersAnchor) {
          membersAnchor.after(crmLink);
        } else {
          nav.appendChild(crmLink);
        }
      } else {
        existingCrm.hidden = false;
      }
    } else if (existingCrm) {
      // Never show CRM to non-admins (including hard-coded markup)
      existingCrm.remove();
    }

    if (!existingSignOut) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-cta nav-cta--quiet";
      btn.textContent = "Sign Out";
      btn.dataset.authInjected = "true";
      btn.dataset.signOut = "true";
      btn.addEventListener("click", async () => {
        try {
          await signOut();
        } finally {
          window.location.href = "login.html";
        }
      });
      nav.appendChild(btn);
    } else {
      existingSignOut.hidden = false;
      if (!existingSignOut.dataset.bound) {
        existingSignOut.dataset.bound = "true";
        existingSignOut.addEventListener("click", async () => {
          try {
            await signOut();
          } finally {
            window.location.href = "login.html";
          }
        });
      }
    }
  } else if (guestLogin) {
    guestLogin.hidden = false;
    if (guestJoin) guestJoin.hidden = false;
  }

  return session;
}

syncAuthNav();
