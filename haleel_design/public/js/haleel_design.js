
(() => {
    "use strict";

    if (window.__haleelDesignInitialized) return;
    window.__haleelDesignInitialized = true;

    const SHELL_ID = "haleel-design-shell";
    const NAV_API = "haleel_design.api.get_navigation";
    const PROFILE_API =
        "haleel_design.api.get_current_user_profile";

    let navigation = [];
    let profile = null;
    let routeListenerAdded = false;
    let observer = null;
    let redirectingFromHome = false;

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[char]);

    const getRoute = () =>
        frappe.get_route ? (frappe.get_route() || []) : [];

    const routeKey = (route) =>
        (route || []).map(String).join("/");

    function normalizeItem(item) {
        const destination =
            item.destination || item.link_to || "";

        const type = String(
            item.type || item.item_type || ""
        ).toLowerCase();

        let route = Array.isArray(item.route)
            ? item.route
            : null;

        if (!route) {
            if (!destination) return null;

            if (type === "doctype") {
                route = ["List", destination];
            } else if (type === "report") {
                route = ["query-report", destination];
            } else if (type === "page") {
                route = [destination];
            } else {
                return null;
            }
        }

        if (!route.length) return null;

        return {
            label:
                item.label ||
                item.name1 ||
                destination ||
                item.name ||
                "Untitled",
            route,
        };
    }

    function normalizeGroups(data) {
        if (!Array.isArray(data)) return [];

        return data.map((group) => ({
            title:
                group.title ||
                group.group_title ||
                group.name ||
                "Navigation",
            items: (
                group.items ||
                group.navigation_items ||
                []
            ).map(normalizeItem).filter(Boolean),
        })).filter((group) => group.items.length);
    }

    function routeMatches(itemRoute, currentRoute) {
        if (routeKey(itemRoute) === routeKey(currentRoute)) {
            return true;
        }

        return (
            itemRoute[0] === "List" &&
            itemRoute[1] &&
            currentRoute[0] === itemRoute[1]
        );
    }

    function renderNavigation() {
        const shell = document.getElementById(SHELL_ID);
        const nav = shell?.querySelector(".hd-navigation");

        if (!nav) return;

        if (!navigation.length) {
            nav.innerHTML = `
                <div class="hd-empty">
                    No navigation items are configured.
                    <small>Check your Nav Access settings.</small>
                </div>`;
            return;
        }

        const currentRoute = getRoute();

        nav.innerHTML = navigation.map((group, index) => {
            const groupId = `hd-group-${index}`;

            const items = group.items.map((item) => {
                const active = routeMatches(
                    item.route, currentRoute
                );

                return `
                    <button type="button"
                        class="hd-nav-item ${active ? "is-active" : ""}"
                        data-route="${escapeHTML(JSON.stringify(item.route))}"
                        title="${escapeHTML(item.label)}">
                        <span class="hd-nav-item-label">
                            ${escapeHTML(item.label)}
                        </span>
                    </button>`;
            }).join("");

            return `
                <section class="hd-nav-group">
                    <button type="button"
                        class="hd-nav-group-title"
                        aria-expanded="true"
                        data-group="${groupId}">
                        <span>${escapeHTML(group.title)}</span>
                        <span class="hd-chevron">⌄</span>
                    </button>
                    <div class="hd-nav-group-items"
                        id="${groupId}">
                        ${items}
                    </div>
                </section>`;
        }).join("");
    }

    function initials(name) {
        return String(name || "User")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "U";
    }

    function renderProfile() {
        const area = document.querySelector(
            `#${SHELL_ID} .hd-profile`
        );

        if (!area) return;

        const fullName =
            profile?.full_name ||
            frappe.session?.user ||
            "User";

        const email =
            profile?.email ||
            frappe.session?.user ||
            "";

        const avatar = profile?.image
            ? `<img src="${escapeHTML(profile.image)}"
                alt="" class="hd-avatar-image">`
            : `<span class="hd-avatar-initials">
                ${escapeHTML(initials(fullName))}
               </span>`;

        area.innerHTML = `
            <button type="button"
                class="hd-profile-trigger"
                aria-expanded="false">
                <span class="hd-avatar">${avatar}</span>
                <span class="hd-profile-copy">
                    <strong>${escapeHTML(fullName)}</strong>
                    <small>${escapeHTML(email)}</small>
                </span>
                <span class="hd-profile-chevron">⌃</span>
            </button>

            <div class="hd-profile-menu" hidden>
                <div class="hd-profile-menu-heading">
                    My Account
                </div>
                <button type="button"
                    data-profile-action="settings">
                    My Settings
                </button>
                <button type="button"
                    data-profile-action="password">
                    Change Password
                </button>
                <button type="button"
                    data-profile-action="reload">
                    Reload
                </button>
                <div class="hd-profile-divider"></div>
                <button type="button"
                    class="hd-logout-action"
                    data-profile-action="logout">
                    Log Out
                </button>
            </div>`;
    }

    function installShell() {
        let shell = document.getElementById(SHELL_ID);
        if (shell) return shell;

        if (
            !document.querySelector(".main-section") &&
            !document.querySelector("#page-container")
        ) {
            return null;
        }

        shell = document.createElement("div");
        shell.id = SHELL_ID;

        shell.innerHTML = `
            <aside class="hd-sidebar"
                aria-label="Haleel navigation">

                <div class="hd-brand">
                    <div class="hd-brand-mark">H</div>
                    <div class="hd-brand-copy">
                        <strong>Haleel</strong>
                        <small>WORKSPACE</small>
                    </div>
                </div>

                <div class="hd-sidebar-caption">
                    NAVIGATION
                </div>

                <nav class="hd-navigation"
                    aria-label="Main navigation">
                    <div class="hd-loading">
                        Loading navigation…
                    </div>
                </nav>

                <div class="hd-sidebar-bottom">
                    <div class="hd-sidebar-footer">
                        <span class="hd-status-dot"></span>
                        <span>Haleel Design</span>
                    </div>
                    <div class="hd-profile"></div>
                </div>
            </aside>

            <button type="button"
                class="hd-mobile-toggle"
                aria-label="Open navigation"
                aria-expanded="false">☰</button>

            <button type="button"
                class="hd-mobile-backdrop"
                aria-label="Close navigation"></button>`;

        document.body.appendChild(shell);
        document.body.classList.add("haleel-design-active");

        shell.querySelector(".hd-mobile-toggle")
            .addEventListener("click", () => {
                const open =
                    shell.classList.toggle("hd-sidebar-open");

                shell.querySelector(".hd-mobile-toggle")
                    .setAttribute("aria-expanded", String(open));
            });

        shell.querySelector(".hd-mobile-backdrop")
            .addEventListener("click", () => {
                closeMobileSidebar(shell);
            });

        shell.querySelector(".hd-navigation")
            .addEventListener("click", (event) => {
                const groupButton =
                    event.target.closest("[data-group]");

                if (groupButton) {
                    const targetId = groupButton.dataset.group;
                    const target = Array.from(
                        shell.querySelectorAll(".hd-nav-group-items")
                    ).find((element) => element.id === targetId);

                    if (target) {
                        const expanded =
                            groupButton.getAttribute(
                                "aria-expanded"
                            ) === "true";

                        groupButton.setAttribute(
                            "aria-expanded",
                            String(!expanded)
                        );

                        target.hidden = expanded;
                    }
                    return;
                }

                const button =
                    event.target.closest("[data-route]");

                if (!button) return;

                try {
                    const route = JSON.parse(button.dataset.route);

                    if (Array.isArray(route) && route.length) {
                        frappe.set_route(...route);
                        closeMobileSidebar(shell);
                    }
                } catch (error) {
                    console.error(
                        "[Haleel Design] Invalid navigation route",
                        error
                    );
                }
            });

        shell.querySelector(".hd-profile")
            .addEventListener("click", handleProfileClick);

        document.addEventListener("click", handleOutsideClick);

        return shell;
    }

    function closeMobileSidebar(shell) {
        shell.classList.remove("hd-sidebar-open");

        const toggle =
            shell.querySelector(".hd-mobile-toggle");

        if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
        }
    }

    function handleOutsideClick(event) {
        const shell = document.getElementById(SHELL_ID);

        if (!shell || shell.contains(event.target)) return;

        const menu = shell.querySelector(".hd-profile-menu");
        const trigger = shell.querySelector(".hd-profile-trigger");

        if (menu) menu.hidden = true;

        if (trigger) {
            trigger.setAttribute("aria-expanded", "false");
        }
    }

    function handleProfileClick(event) {
        const shell = document.getElementById(SHELL_ID);
        if (!shell) return;

        const trigger =
            event.target.closest(".hd-profile-trigger");

        if (trigger) {
            const menu = shell.querySelector(".hd-profile-menu");
            if (!menu) return;

            const open = menu.hidden;
            menu.hidden = !open;

            trigger.setAttribute(
                "aria-expanded", String(open)
            );
            return;
        }

        const button =
            event.target.closest("[data-profile-action]");

        if (!button) return;

        const action = button.dataset.profileAction;
        const menu = shell.querySelector(".hd-profile-menu");
        const profileTrigger =
            shell.querySelector(".hd-profile-trigger");

        if (menu) menu.hidden = true;

        if (profileTrigger) {
            profileTrigger.setAttribute(
                "aria-expanded", "false"
            );
        }

        if (action === "settings") {
            frappe.set_route(
                "Form", "User", frappe.session.user
            );
        } else if (action === "password") {
            showChangePasswordDialog();
        } else if (action === "reload") {
            window.location.reload();
        } else if (action === "logout") {
            frappe.app.logout();
        }
    }

    function showChangePasswordDialog() {
        const dialog = new frappe.ui.Dialog({
            title: "Change Password",
            fields: [
                {
                    fieldname: "new_password",
                    label: "New Password",
                    fieldtype: "Password",
                    reqd: 1,
                },
                {
                    fieldname: "confirm_password",
                    label: "Confirm New Password",
                    fieldtype: "Password",
                    reqd: 1,
                },
            ],
            primary_action_label: "Change Password",

            primary_action(values) {
                if (
                    values.new_password !==
                    values.confirm_password
                ) {
                    frappe.msgprint(
                        "The passwords do not match."
                    );
                    return;
                }

                if (
                    String(values.new_password || "").length < 8
                ) {
                    frappe.msgprint(
                        "Use a password with at least 8 characters."
                    );
                    return;
                }

                frappe.call({
                    method:
                        "frappe.core.doctype.user.user.update_password",
                    args: {
                        new_password: values.new_password,
                    },
                    freeze: true,
                    freeze_message: "Updating password…",

                    callback(response) {
                        if (response.exc) return;

                        dialog.hide();

                        frappe.show_alert({
                            message: "Password updated.",
                            indicator: "green",
                        });
                    },
                });
            },
        });

        dialog.show();
    }

    function loadProfile() {
        frappe.call({
            method: PROFILE_API,

            callback(response) {
                profile = response.message || null;
                renderProfile();
            },

            error(error) {
                console.error(
                    "[Haleel Design] Could not load profile",
                    error
                );
                renderProfile();
            },
        });
    }

    function redirectFromHome() {
        if (redirectingFromHome) return;

        const route = getRoute();
        const current = String(route[0] || "").toLowerCase();

        if (current !== "home" && current !== "workspace") {
            return;
        }

        const firstGroup = navigation.find(
            (group) => group.items && group.items.length
        );

        if (!firstGroup) return;

        const target = firstGroup.items[0].route;

        if (routeKey(target) === routeKey(route)) return;

        redirectingFromHome = true;

        frappe.set_route(...target);

        window.setTimeout(() => {
            redirectingFromHome = false;
        }, 500);
    }

    function loadNavigation() {
        frappe.call({
            method: NAV_API,

            callback(response) {
                navigation = normalizeGroups(response.message);
                renderNavigation();
                redirectFromHome();
            },

            error(error) {
                console.error(
                    "[Haleel Design] Navigation API failed",
                    error
                );

                const nav = document.querySelector(
                    `#${SHELL_ID} .hd-navigation`
                );

                if (nav) {
                    nav.innerHTML = `
                        <div class="hd-empty">
                            Navigation could not load.
                            <small>Check your Nav Access configuration.</small>
                        </div>`;
                }
            },
        });
    }

    function refreshNavigation() {
        renderNavigation();

        const shell = document.getElementById(SHELL_ID);

        if (shell) closeMobileSidebar(shell);

        redirectFromHome();
    }

    function start() {
        if (!installShell()) return;

        if (!routeListenerAdded && frappe.router?.on) {
            routeListenerAdded = true;
            frappe.router.on("change", refreshNavigation);
        }

        loadNavigation();
        loadProfile();
    }

    function init() {
        if (
            typeof frappe === "undefined" ||
            !frappe.router
        ) {
            return;
        }

        if (installShell()) {
            start();
            return;
        }

        if (observer) return;

        observer = new MutationObserver(() => {
            if (installShell()) {
                observer.disconnect();
                observer = null;
                start();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded", init, { once: true }
        );
    } else {
        init();
    }
})();
