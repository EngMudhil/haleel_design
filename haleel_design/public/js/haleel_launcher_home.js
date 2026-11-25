(() => {
    "use strict";

    if (window.__haleelLauncherHomeInitialized) return;
    window.__haleelLauncherHomeInitialized = true;

    const ROOT_ID = "hd-desk-launcher";
    const BODY_CLASS = "hd-launcher-active";
    const APPLICATIONS_API = "haleel_design.api.api.get_applications";
    const PROFILE_API = "haleel_design.api.api.get_current_user_profile";
    const ACTIVE_APP_KEY = "hd-active-application";

    let observer = null;
    let requestSequence = 0;

    const route = () => (frappe.get_route?.() || []).map(String);
    const isHome = () => {
        const current = route();
        return !current.length || (current.length === 1 && ["", "desk"].includes(current[0].toLowerCase()));
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[ch]);
    }

    function colorFor(app) {
        const colors = ["teal", "blue", "purple", "orange", "green", "pink", "indigo", "amber"];
        const value = String(app.name || app.title || "Haleel");
        let hash = 0;
        for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
        return colors[Math.abs(hash) % colors.length];
    }

    function iconFor(app) {
        if (window.HaleelIcons?.render) {
            const icon = window.HaleelIcons.render(app.title || app.name);
            if (icon) return icon;
        }
        return '<span class="hd-home-fallback">H</span>';
    }

    function createShell(container) {
        const existing = document.getElementById(ROOT_ID);
        if (existing) return existing;

        const host = document.createElement("div");
        host.innerHTML = `
            <main id="${ROOT_ID}" class="hd-home">
                <header class="hd-home-header">
                    <a href="/desk" class="hd-home-brand" data-home-brand>
                        <span class="hd-home-brand-mark">H</span>
                        <span class="hd-home-brand-name">HALEEL</span>
                    </a>
                    <div class="hd-home-profile">
                        <button class="hd-home-profile-button" type="button" aria-expanded="false">
                            <span class="hd-home-avatar">U</span>
                            <span class="hd-home-profile-name">Loading...</span>
                            <span class="hd-home-chevron">⌄</span>
                        </button>
                        <div class="hd-home-profile-menu" hidden>
                            <button type="button" data-action="profile">My Profile</button>
                            <button type="button" data-action="settings">Settings</button>
                            <button type="button" data-action="password">Change Password</button>
                            <div class="hd-home-menu-divider"></div>
                            <button type="button" data-action="logout" class="hd-home-logout">Log Out</button>
                        </div>
                    </div>
                </header>
                <section class="hd-home-content">
                    <div class="hd-home-intro">
                        <p class="hd-home-eyebrow">YOUR WORKSPACE</p>
                        <h1>Applications</h1>
                        <p>Everything you need, in one workspace.</p>
                    </div>
                    <div class="hd-home-toolbar">
                        <label class="hd-home-search">
                            <span class="hd-home-search-icon">⌕</span>
                            <input type="search" placeholder="Search applications..." aria-label="Search applications" autocomplete="off">
                            <kbd>Ctrl K</kbd>
                        </label>
                        <span class="hd-home-count"></span>
                    </div>
                    <div class="hd-home-grid" aria-live="polite">
                        <div class="hd-home-loading">Loading your applications...</div>
                    </div>
                    <footer class="hd-home-footer">Haleel Technology</footer>
                </section>
            </main>`;
        const root = host.firstElementChild;
        container.appendChild(root);
        bindEvents(root);
        return root;
    }

    function renderProfile(root, profile = {}) {
        const name = profile.full_name || profile.name || frappe.session?.user_fullname || "User";
        const avatar = root.querySelector(".hd-home-avatar");
        const profileName = root.querySelector(".hd-home-profile-name");
        if (profileName) profileName.textContent = name;
        if (avatar) {
            if (profile.image) {
                avatar.innerHTML = `<img src="${escapeHTML(profile.image)}" alt="">`;
            } else {
                avatar.textContent = name.trim().charAt(0).toUpperCase() || "U";
            }
        }
        root.__hdProfile = profile;
    }

    function renderApplications(root, searchTerm = "") {
        if (!root?.isConnected) return;
        const grid = root.querySelector(".hd-home-grid");
        const count = root.querySelector(".hd-home-count");
        const apps = root.__hdApplications || [];
        const term = String(searchTerm).trim().toLowerCase();
        const filtered = apps.filter(app =>
            String(app.title || app.name || "").toLowerCase().includes(term)
        );

        count.textContent = term ? `${filtered.length} results` : `${apps.length} applications`;

        if (!apps.length) {
            grid.innerHTML = `
                <div class="hd-home-empty">
                    <div class="hd-home-empty-icon">⌂</div>
                    <h3>No applications assigned</h3>
                    <p>Contact your administrator to request access.</p>
                </div>`;
            return;
        }

        if (!filtered.length) {
            grid.innerHTML = `
                <div class="hd-home-empty">
                    <div class="hd-home-empty-icon">⌕</div>
                    <h3>No applications found</h3>
                    <p>Try another search term.</p>
                </div>`;
            return;
        }

        grid.innerHTML = filtered.map(app => {
            const title = escapeHTML(app.title || app.name);
            const route = Array.isArray(app.landing_route) ? app.landing_route : [];
            const enabled = Boolean(app.name && route.length);
            return `
                <button type="button" class="hd-home-card ${colorFor(app)}"
                    ${enabled ? "" : "disabled"}
                    data-application="${escapeHTML(app.name)}"
                    data-route="${escapeHTML(JSON.stringify(route))}"
                    title="${enabled ? title : "No accessible destination configured"}">
                    <span class="hd-home-card-icon">${iconFor(app)}</span>
                    <span class="hd-home-card-title">${title}</span>
                    <span class="hd-home-card-description">${enabled ? "Open application" : "Not available"}</span>
                    <span class="hd-home-card-arrow">↗</span>
                </button>`;
        }).join("");
    }

    function closeProfile(root) {
        const menu = root.querySelector(".hd-home-profile-menu");
        const button = root.querySelector(".hd-home-profile-button");
        if (menu) menu.hidden = true;
        button?.setAttribute("aria-expanded", "false");
    }

    function bindEvents(root) {
        root.addEventListener("input", event => {
            if (event.target.matches(".hd-home-search input")) {
                renderApplications(root, event.target.value);
            }
        });

        root.addEventListener("click", event => {
            const profileButton = event.target.closest(".hd-home-profile-button");
            if (profileButton) {
                const menu = root.querySelector(".hd-home-profile-menu");
                menu.hidden = !menu.hidden;
                profileButton.setAttribute("aria-expanded", String(!menu.hidden));
                return;
            }

            const card = event.target.closest(".hd-home-card");
            if (card && !card.disabled) {
                try {
                    const targetRoute = JSON.parse(card.dataset.route || "[]");
                    if (!targetRoute.length) return;
                    sessionStorage.setItem(ACTIVE_APP_KEY, card.dataset.application);
                    closeProfile(root);
                    frappe.set_route(...targetRoute);
                } catch (error) {
                    console.error("[Haleel Launcher] Could not open application", error);
                }
                return;
            }

            const actionButton = event.target.closest("[data-action]");
            if (actionButton) {
                const action = actionButton.dataset.action;
                const profile = root.__hdProfile || {};
                closeProfile(root);

                if (action === "profile" && profile.name) {
                    frappe.set_route("Form", "User", profile.name);
                } else if (action === "settings") {
                    frappe.set_route("Form", "User", frappe.session.user);
                } else if (action === "password") {
                    window.location.href = "/update-password";
                } else if (action === "logout") {
                    frappe.app.logout();
                }
                return;
            }

            if (!event.target.closest(".hd-home-profile")) closeProfile(root);
            if (event.target.closest("[data-home-brand]")) {
                event.preventDefault();
                frappe.set_route("desk");
            }
        });

        root.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                root.querySelector(".hd-home-search input")?.focus();
            }
            if (event.key === "Escape") {
                const input = root.querySelector(".hd-home-search input");
                if (document.activeElement === input) {
                    input.value = "";
                    renderApplications(root);
                    input.blur();
                }
                closeProfile(root);
            }
        });
    }

    async function loadData(root) {
        if (!root?.isConnected) return;
        const sequence = ++requestSequence;
        const grid = root.querySelector(".hd-home-grid");
        grid.innerHTML = '<div class="hd-home-loading">Loading your applications...</div>';

        try {
            const [appsResponse, profileResponse] = await Promise.all([
                frappe.call({ method: APPLICATIONS_API }),
                frappe.call({ method: PROFILE_API })
            ]);
            if (!root.isConnected || sequence !== requestSequence) return;

            root.__hdApplications = Array.isArray(appsResponse.message) ? appsResponse.message : [];
            renderProfile(root, profileResponse.message || {});
            renderApplications(root);
        } catch (error) {
            if (!root.isConnected || sequence !== requestSequence) return;
            console.error("[Haleel Launcher] API loading failed:", error);
            grid.innerHTML = `
                <div class="hd-home-empty">
                    <h3>Unable to load applications</h3>
                    <p>Please check your connection and try again.</p>
                    <button type="button" class="hd-home-retry">Try Again</button>
                </div>`;
            grid.querySelector(".hd-home-retry")?.addEventListener("click", () => loadData(root));
        }
    }

    function mount() {
        if (!isHome() || !document.body) return false;
        const existing = document.getElementById(ROOT_ID);
        if (existing) {
            document.body.classList.add(BODY_CLASS);
            return true;
        }

        const container =
            document.querySelector("#page-desktop .main-section") ||
            document.querySelector(".main-section") ||
            document.querySelector("#page-desktop") ||
            document.body;

        document.body.classList.add(BODY_CLASS);
        const root = createShell(container);
        if (!root) {
            document.body.classList.remove(BODY_CLASS);
            return false;
        }
        loadData(root);
        return true;
    }

    function scheduleMount() {
        if (!isHome()) return;
        requestAnimationFrame(() => requestAnimationFrame(mount));
    }

    function observeDesk() {
        if (observer || !document.body) return;
        observer = new MutationObserver(() => {
            if (isHome() && !document.getElementById(ROOT_ID)) mount();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function initialize() {
        if (typeof frappe === "undefined" || !frappe.router) return;
        observeDesk();

        frappe.router.on?.("change", () => {
            if (isHome()) {
                scheduleMount();
            } else {
                requestSequence++;
                document.getElementById(ROOT_ID)?.remove();
                document.body.classList.remove(BODY_CLASS);
            }
        });

        if (isHome()) scheduleMount();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }

    console.info("[Haleel Launcher] Initialized");
})();