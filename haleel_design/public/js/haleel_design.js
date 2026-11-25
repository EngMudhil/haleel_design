
(() => {
    "use strict";

    if (window.__haleelHorizontalNavInitialized) return;
    window.__haleelHorizontalNavInitialized = true;

    const ROOT_ID = "hd-horizontal-nav";
    const APPLICATIONS_API = "haleel_design.api.api.get_applications";
    const APP_NAV_API = "haleel_design.api.api.get_application_navigation";
    const PROFILE_API = "haleel_design.api.api.get_current_user_profile";
    const ACTIVE_APP_KEY = "hd-active-application";
    const HOME_ROUTES = new Set(["", "desk"]);

    let applications = [];
    let activeApplication = "";
    let applicationData = null;
    let profile = null;
    let applicationsPromise = null;
    let navigationRequest = 0;
    let observer = null;

    const getRoute = () => (frappe.get_route?.() || []).map(String);
    const isHome = () => {
        const r = getRoute();
        return !r.length || (r.length === 1 && HOME_ROUTES.has((r[0] || "").toLowerCase()));
    };
    const routeKey = route => (route || []).map(v => String(v ?? "").toLowerCase()).join("/");
    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[ch]);

    function routeMatchesItem(currentRoute, item) {
        const target = item?.route || [];
        if (!target.length || !currentRoute.length) return false;
        if (routeKey(currentRoute) === routeKey(target)) return true;

        const type = String(item.type || "").toLowerCase();
        const destination = String(item.destination || target[1] || "");

        // Frappe List routes: ["List", "Sales Invoice"]
        // Frappe Form routes: ["Form", "Sales Invoice", "SINV-00001"]
        if (type === "doctype") {
            const firstSegment = String(currentRoute[0] || "").toLowerCase();

            const routeDoctype = ["list", "form"].includes(firstSegment)
                ? currentRoute[1]
                : currentRoute[0];

            if (
                String(routeDoctype || "").toLowerCase() ===
                destination.toLowerCase()
            ) {
                return true;
            }
        }

        // Query report routes may carry extra filter parameters.
        if (type === "report" && currentRoute[0] === "query-report" &&
            currentRoute[1]?.toLowerCase() === destination.toLowerCase()) return true;

        // Pages may include parameters after the page route.
        if (type === "page" && currentRoute[0].toLowerCase() === destination.toLowerCase()) return true;
        return false;
    }

    function findApplicationForRoute() {
        const current = getRoute();
        return applications.find(app =>
            (app.items || []).some(item => routeMatchesItem(current, item))
        );
    }

    async function loadApplications() {
        if (!applicationsPromise) {
            applicationsPromise = frappe.call({ method: APPLICATIONS_API })
                .then(response => {
                    applications = Array.isArray(response.message) ? response.message : [];
                    return applications;
                })
                .catch(error => {
                    applicationsPromise = null;
                    console.error("[Haleel Design] Could not load applications", error);
                    throw error;
                });
        }
        return applicationsPromise;
    }

    async function chooseApplication() {
        await loadApplications();
        const matched = findApplicationForRoute();
        const saved = sessionStorage.getItem(ACTIVE_APP_KEY);

        if (matched) {
            activeApplication = matched.name;
        } else if (saved && applications.some(app => app.name === saved)) {
            activeApplication = saved;
        } else {
            activeApplication = "";
        }

        if (activeApplication) sessionStorage.setItem(ACTIVE_APP_KEY, activeApplication);
        return activeApplication;
    }

    function currentActiveRouteItem() {
        const nav = applicationData?.navigation || [];
        const current = getRoute();
        for (const entry of nav) {
            if (entry.type === "dropdown") {
                const found = (entry.items || []).find(item => routeMatchesItem(current, item));
                if (found) return found;
            } else if (routeMatchesItem(current, entry)) {
                return entry;
            }
        }
        return null;
    }

    function installStyles() {
        if (document.getElementById("hd-horizontal-nav-style")) return;
        const style = document.createElement("style");
        style.id = "hd-horizontal-nav-style";
        style.textContent = `
            body.hd-horizontal-nav-active .navbar,
            body.hd-horizontal-nav-active .desk-sidebar,
            body.hd-horizontal-nav-active .body-sidebar-container,
            body.hd-horizontal-nav-active .standard-sidebar,
            body.hd-horizontal-nav-active .app-sidebar,
            body.hd-horizontal-nav-active #desk-dock { display:none !important; }
            body.hd-horizontal-nav-active .main-section,
            body.hd-horizontal-nav-active .layout-main-section-wrapper {
                width:100% !important; max-width:100% !important; margin:0 !important;
            }
            #${ROOT_ID}, #${ROOT_ID} * { box-sizing:border-box; }
            #${ROOT_ID} {
                position:relative; z-index:1035; width:100%; color:#eaf1f7;
                background:#172337; border-bottom:1px solid #293950;
                box-shadow:0 2px 8px rgba(17,32,52,.12); font-family:inherit;
            }
            #${ROOT_ID} .hd-nav-main {
                min-height:60px; display:flex; align-items:center; gap:18px;
                padding:0 22px; width:100%;
            }
            #${ROOT_ID} .hd-brand {
                flex:0 0 auto; display:inline-flex; align-items:center; gap:10px;
                color:#fff; text-decoration:none; font-weight:750; font-size:17px;
                white-space:nowrap;
            }
            #${ROOT_ID} .hd-brand-mark {
                display:grid; place-items:center; width:32px; height:32px;
                border-radius:9px; background:#0f9f91; color:#fff; font-size:16px;
            }
            #${ROOT_ID} .hd-app-name {
                flex:0 0 auto; color:#aebdce; font-size:12px; font-weight:700;
                text-transform:uppercase; letter-spacing:.08em; white-space:nowrap;
                padding-left:14px; border-left:1px solid #3a4a60;
            }
            #${ROOT_ID} .hd-nav-scroll {
                flex:1 1 auto; min-width:0; display:flex; align-items:center;
                gap:3px; overflow-x:auto; scrollbar-width:none;
            }
            #${ROOT_ID} .hd-nav-scroll::-webkit-scrollbar { display:none; }
            #${ROOT_ID} .hd-nav-link, #${ROOT_ID} .hd-dropdown-trigger {
                display:inline-flex; align-items:center; gap:7px; min-height:38px;
                padding:0 11px; border:0; border-radius:7px; background:transparent;
                color:#d4deea; text-decoration:none; font-size:13px; white-space:nowrap;
                cursor:pointer; font-family:inherit;
            }
            #${ROOT_ID} .hd-nav-link:hover, #${ROOT_ID} .hd-dropdown-trigger:hover {
                background:#26364d; color:#fff;
            }
            #${ROOT_ID} .hd-nav-link.is-active, #${ROOT_ID} .hd-dropdown-trigger.is-active {
                color:#fff; background:#0f766e; font-weight:650;
            }
            #${ROOT_ID} .hd-dropdown { position:relative; flex:0 0 auto; }
            #${ROOT_ID} .hd-dropdown-trigger::after { content:"⌄"; font-size:13px; opacity:.8; }
            #${ROOT_ID} .hd-dropdown-menu {
                display:none; position:absolute; top:calc(100% + 3px); left:0;
                min-width:210px; max-width:300px; max-height:65vh; overflow:auto;
                padding:6px; border:1px solid #e5eaf0; border-radius:10px;
                background:#fff; box-shadow:0 12px 32px rgba(20,35,55,.18);
            }
            #${ROOT_ID} .hd-dropdown:hover > .hd-dropdown-menu,
            #${ROOT_ID} .hd-dropdown:focus-within > .hd-dropdown-menu,
            #${ROOT_ID} .hd-dropdown.is-open > .hd-dropdown-menu { display:block; }
            #${ROOT_ID} .hd-dropdown-menu button {
                display:block; width:100%; padding:9px 11px; border:0; border-radius:6px;
                background:transparent; color:#263449; text-align:left; font-size:13px;
                cursor:pointer; font-family:inherit;
            }
            #${ROOT_ID} .hd-dropdown-menu button:hover,
            #${ROOT_ID} .hd-dropdown-menu button.is-active {
                background:#e8f5f3; color:#086c63;
            }
            #${ROOT_ID} .hd-nav-actions { display:flex; align-items:center; gap:8px; flex:0 0 auto; }
            #${ROOT_ID} .hd-profile-trigger {
                display:inline-flex; align-items:center; gap:8px; max-width:190px;
                min-height:38px; padding:4px 9px; border:1px solid #34445a;
                border-radius:8px; color:#eaf1f7; background:transparent; cursor:pointer;
            }
            #${ROOT_ID} .hd-avatar {
                display:grid; place-items:center; width:27px; height:27px; overflow:hidden;
                border-radius:50%; background:#0f9f91; color:#fff; font-size:11px;
                font-weight:700; flex:0 0 27px;
            }
            #${ROOT_ID} .hd-avatar img { width:100%; height:100%; object-fit:cover; }
            #${ROOT_ID} .hd-profile-name {
                overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;
            }
            #${ROOT_ID} .hd-profile-menu { right:0; left:auto; min-width:185px; }
            #${ROOT_ID} .hd-menu-heading {
                padding:8px 10px 9px; color:#718096; font-size:11px;
                border-bottom:1px solid #edf0f4; margin-bottom:4px;
            }
            #${ROOT_ID} .hd-mobile-toggle {
                display:none; border:0; padding:5px 8px; color:#fff;
                background:transparent; font-size:22px; cursor:pointer;
            }
            #${ROOT_ID} .hd-empty { padding:12px; color:#d4deea; font-size:12px; }
            @media(max-width:1050px) {
                #${ROOT_ID} .hd-nav-main { gap:10px; padding:0 12px; }
                #${ROOT_ID} .hd-brand-name { display:none; }
                #${ROOT_ID} .hd-nav-link, #${ROOT_ID} .hd-dropdown-trigger { padding:0 8px; }
            }
            @media(max-width:700px) {
                #${ROOT_ID} .hd-nav-main { flex-wrap:wrap; gap:8px; padding:8px 12px; }
                #${ROOT_ID} .hd-mobile-toggle { display:inline-block; }
                #${ROOT_ID} .hd-brand-name { display:inline; }
                #${ROOT_ID} .hd-app-name { margin-right:auto; }
                #${ROOT_ID} .hd-nav-scroll {
                    display:none; order:5; flex:0 0 100%; width:100%;
                    align-items:stretch; flex-direction:column; gap:2px; padding:5px 0 8px;
                    overflow:visible;
                }
                #${ROOT_ID}.hd-mobile-open .hd-nav-scroll { display:flex; }
                #${ROOT_ID} .hd-nav-link, #${ROOT_ID} .hd-dropdown-trigger {
                    justify-content:space-between; width:100%; min-height:40px;
                }
                #${ROOT_ID} .hd-dropdown { width:100%; }
                #${ROOT_ID} .hd-dropdown-menu {
                    position:static; max-width:none; max-height:220px; margin:2px 0 5px;
                    box-shadow:none; border-color:#34445a; background:#202f44;
                }
                #${ROOT_ID} .hd-dropdown-menu button { color:#eaf1f7; }
                #${ROOT_ID} .hd-dropdown-menu button:hover,
                #${ROOT_ID} .hd-dropdown-menu button.is-active { background:#0f766e; color:#fff; }
                #${ROOT_ID} .hd-profile-name { display:none; }
                #${ROOT_ID} .hd-profile-trigger { padding:4px; }
            }
        `;
        document.head.appendChild(style);
    }

    function renderProfile() {
        const shell = document.getElementById(ROOT_ID);
        if (!shell) return;
        const name = profile?.full_name || profile?.name || frappe.session?.user || "User";
        const initials = String(name).trim().split(/\s+/).slice(0, 2).map(s => s[0] || "").join("").toUpperCase();
        const avatar = profile?.image
            ? `<img src="${escapeHTML(profile.image)}" alt="">`
            : escapeHTML(initials || "U");
        const trigger = shell.querySelector(".hd-profile-trigger");
        if (trigger) {
            trigger.innerHTML = `
                <span class="hd-avatar">${avatar}</span>
                <span class="hd-profile-name">${escapeHTML(name)}</span>
                <span aria-hidden="true">⌄</span>`;
        }
        const heading = shell.querySelector(".hd-menu-heading");
        if (heading) heading.textContent = profile?.email || frappe.session?.user || "";
    }

    function renderNavigation() {
        const shell = document.getElementById(ROOT_ID);
        const container = shell?.querySelector(".hd-nav-scroll");
        if (!container) return;

        const entries = applicationData?.navigation || [];
        if (!entries.length) {
            container.innerHTML = '<div class="hd-empty">No navigation items are configured for this application.</div>';
            return;
        }

        const activeItem = currentActiveRouteItem();
        container.innerHTML = entries.map(entry => {
            if (entry.type === "dropdown") {
                const reportItems = entry.items || [];
                const hasActive = reportItems.some(item => item.name === activeItem?.name);
                return `
                    <div class="hd-dropdown" data-hd-dropdown>
                        <button type="button" class="hd-dropdown-trigger ${hasActive ? "is-active" : ""}"
                            aria-expanded="false">${escapeHTML(entry.label || "Reports")}</button>
                        <div class="hd-dropdown-menu" role="menu">
                            ${reportItems.map(item => `
                                <button type="button" role="menuitem"
                                    class="${item.name === activeItem?.name ? "is-active" : ""}"
                                    data-hd-route="${escapeHTML(JSON.stringify(item.route))}">
                                    ${escapeHTML(item.label)}
                                </button>`).join("")}
                        </div>
                    </div>`;
            }

            return `
                <button type="button" class="hd-nav-link ${entry.name === activeItem?.name ? "is-active" : ""}"
                    data-hd-route="${escapeHTML(JSON.stringify(entry.route))}"
                    title="${escapeHTML(entry.label)}">${escapeHTML(entry.label)}</button>`;
        }).join("");
    }

    function createShell() {
        let shell = document.getElementById(ROOT_ID);
        if (shell) return shell;

        const mount = document.querySelector(".main-section");
        if (!mount) return null;
        installStyles();

        shell = document.createElement("div");
        shell.id = ROOT_ID;
        shell.innerHTML = `
            <div class="hd-nav-main">
                <button type="button" class="hd-mobile-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
                <a class="hd-brand" href="/desk" aria-label="Haleel Applications Home">
                    <span class="hd-brand-mark">H</span><span class="hd-brand-name">Haleel</span>
                </a>
                <span class="hd-app-name">Application</span>
                <nav class="hd-nav-scroll" aria-label="Application navigation">
                    <div class="hd-empty">Loading navigation…</div>
                </nav>
                <div class="hd-nav-actions">
                    <div class="hd-dropdown" data-hd-profile>
                        <button type="button" class="hd-profile-trigger" aria-expanded="false">
                            <span class="hd-avatar">U</span><span class="hd-profile-name">User</span><span>⌄</span>
                        </button>
                        <div class="hd-dropdown-menu hd-profile-menu" role="menu">
                            <div class="hd-menu-heading">Loading profile…</div>
                            <button type="button" data-hd-action="settings">My Settings</button>
                            <button type="button" data-hd-action="reload">Reload Desk</button>
                            <button type="button" data-hd-action="logout">Log out</button>
                        </div>
                    </div>
                </div>
            </div>`;

        mount.insertBefore(shell, mount.firstChild);
        document.body.classList.add("hd-horizontal-nav-active");
        document.body.classList.remove("hd-launcher-active");

        shell.addEventListener("click", event => {
            const mobileToggle = event.target.closest(".hd-mobile-toggle");
            if (mobileToggle) {
                const open = shell.classList.toggle("hd-mobile-open");
                mobileToggle.setAttribute("aria-expanded", String(open));
                return;
            }

            const dropdownTrigger = event.target.closest(".hd-dropdown-trigger, .hd-profile-trigger");
            if (dropdownTrigger) {
                const dropdown = dropdownTrigger.closest(".hd-dropdown");
                const open = dropdown.classList.toggle("is-open");
                dropdownTrigger.setAttribute("aria-expanded", String(open));
                return;
            }

            const routeButton = event.target.closest("[data-hd-route]");
            if (routeButton) {
                try {
                    const targetRoute = JSON.parse(routeButton.dataset.hdRoute || "[]");
                    if (Array.isArray(targetRoute) && targetRoute.length) frappe.set_route(...targetRoute);
                } catch (error) {
                    console.error("[Haleel Design] Invalid navigation route", error);
                }
                closeMenus(shell);
                return;
            }

            const action = event.target.closest("[data-hd-action]")?.dataset.hdAction;
            if (action === "settings") {
                if (frappe.ui?.toolbar?.route_to_user) frappe.ui.toolbar.route_to_user();
                else frappe.set_route("Form", "User", frappe.session.user);
            } else if (action === "reload") {
                window.location.reload();
            } else if (action === "logout") {
                frappe.app.logout();
            }

            if (event.target.closest(".hd-brand")) {
                event.preventDefault();
                sessionStorage.removeItem(ACTIVE_APP_KEY);
                frappe.set_route("desk");
            }
        });

        return shell;
    }

    function closeMenus(shell) {
        shell?.classList.remove("hd-mobile-open");
        shell?.querySelector(".hd-mobile-toggle")?.setAttribute("aria-expanded", "false");
        shell?.querySelectorAll(".hd-dropdown.is-open").forEach(el => {
            el.classList.remove("is-open");
            el.querySelector("button")?.setAttribute("aria-expanded", "false");
        });
    }

    async function loadProfile() {
        try {
            const response = await frappe.call({ method: PROFILE_API });
            profile = response.message || {};
            renderProfile();
        } catch (error) {
            console.error("[Haleel Design] Profile loading failed", error);
            profile = { full_name: frappe.session?.user || "User" };
            renderProfile();
        }
    }

    async function loadApplicationNavigation() {
        const requestId = ++navigationRequest;
        const shell = createShell();
        if (!shell) return;

        try {
            const appName = await chooseApplication();
            if (!appName) {
                shell.querySelector(".hd-app-name").textContent = "Applications";
                shell.querySelector(".hd-nav-scroll").innerHTML =
                    '<div class="hd-empty">This route is not assigned to an application.</div>';
                return;
            }

            const response = await frappe.call({
                method: APP_NAV_API,
                args: { application: appName }
            });
            if (requestId !== navigationRequest || isHome()) return;

            applicationData = response.message || null;
            shell.querySelector(".hd-app-name").textContent =
                applicationData?.title || appName;
            renderNavigation();
        } catch (error) {
            if (requestId !== navigationRequest) return;
            console.error("[Haleel Design] Application navigation failed", error);
            shell.querySelector(".hd-nav-scroll").innerHTML =
                '<div class="hd-empty">Navigation could not load. Check application access and permissions.</div>';
        }
    }

    async function activateNavigation() {
        if (isHome()) return;
        document.body.classList.remove("hd-launcher-active");
        const shell = createShell();
        if (!shell) return;
        document.body.classList.add("hd-horizontal-nav-active");
        renderProfile();
        await loadApplicationNavigation();
    }

    function activateHome() {
        navigationRequest++;
        document.getElementById(ROOT_ID)?.remove();
        document.body.classList.remove("hd-horizontal-nav-active");
        applicationData = null;
    }

    function onRouteChange() {
        if (isHome()) {
            activateHome();
            return;
        }
        activateNavigation();
        loadProfile();
        closeMenus(document.getElementById(ROOT_ID));
    }

    function init() {
        if (typeof frappe === "undefined" || !frappe.router) return;
        if (isHome()) activateHome();
        else {
            activateNavigation();
            loadProfile();
        }

        frappe.router.on?.("change", onRouteChange);

        if (!observer) {
            observer = new MutationObserver(() => {
                if (isHome()) {
                    if (document.getElementById(ROOT_ID)) activateHome();
                } else if (!document.getElementById(ROOT_ID)) {
                    activateNavigation();
                    loadProfile();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }

    console.info("[Haleel Design] Application-aware horizontal navigation initialized.");
})();