frappe.pages["haleel-launcher"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("Haleel Applications"),
        single_column: true,
    });

    wrapper.haleel_launcher = {
        page,
        loaded: false,
        groups: [],
        profile: null,
    };

    $(wrapper).find(".layout-main-section").html(`
        <main class="hd-launcher">
            <header class="hd-launcher-header">
                <a href="/app/haleel-launcher" class="hd-launcher-brand">
                    <span class="hd-launcher-brand-mark">H</span>
                    <span class="hd-launcher-brand-name">HALEEL</span>
                </a>

                <div class="hd-launcher-profile">
                    <button class="hd-profile-button" type="button"
                        aria-expanded="false">
                        <span class="hd-profile-avatar">...</span>
                        <span class="hd-profile-name">${__("Loading")}</span>
                        <span class="hd-profile-chevron">⌄</span>
                    </button>

                    <div class="hd-profile-menu" hidden>
                        <button data-action="profile">${__("My Profile")}</button>
                        <button data-action="password">${__("Change Password")}</button>
                        <button data-action="settings">${__("Settings")}</button>
                        <div class="hd-profile-divider"></div>
                        <button data-action="logout" class="hd-logout">
                            ${__("Log Out")}
                        </button>
                    </div>
                </div>
            </header>

            <section class="hd-launcher-content">
                <div class="hd-launcher-intro">
                    <p class="hd-launcher-eyebrow">${__("YOUR WORKSPACE")}</p>
                    <h1>${__("Applications")}</h1>
                    <p>${__("Everything you need, in one workspace.")}</p>
                </div>

                <div class="hd-launcher-toolbar">
                    <label class="hd-launcher-search">
                        <span class="hd-search-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="11" cy="11" r="7"></circle>
                                <path d="m16 16 4 4"></path>
                            </svg>
                        </span>
                        <input
                            type="search"
                            class="hd-launcher-search-input"
                            placeholder="${__("Search applications...")}"
                            aria-label="${__("Search applications")}"
                            autocomplete="off"
                        >
                        <kbd>Ctrl K</kbd>
                    </label>
                    <span class="hd-launcher-count"></span>
                </div>

                <div class="hd-launcher-grid" aria-live="polite">
                    <div class="hd-launcher-loading">
                        ${__("Loading your applications...")}
                    </div>
                </div>
            </section>

            <footer class="hd-launcher-footer">
                Haleel Technology
            </footer>
        </main>
    `);

    setupProfileMenu(wrapper);
    setupLauncherSearch(wrapper);
};

frappe.pages["haleel-launcher"].on_page_show = function (wrapper) {
    loadLauncher(wrapper);
};

function hdEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[character]);
}

function setupProfileMenu(wrapper) {
    const root = $(wrapper);

    root.off("click.hdLauncher");

    root.on("click.hdLauncher", ".hd-profile-button", function (event) {
        event.preventDefault();
        event.stopPropagation();

        const button = $(this);
        const menu = root.find(".hd-profile-menu");
        const isOpen = !menu.prop("hidden");

        menu.prop("hidden", isOpen);
        button.attr("aria-expanded", String(!isOpen));
    });

    root.on("click.hdLauncher", function (event) {
        if ($(event.target).closest(".hd-launcher-profile").length) {
            return;
        }

        root.find(".hd-profile-menu").prop("hidden", true);
        root.find(".hd-profile-button").attr("aria-expanded", "false");
    });

    root.on("click.hdLauncher", ".hd-profile-menu button", function () {
        const action = $(this).data("action");
        const profile = wrapper.haleel_launcher?.profile;

        if (action === "profile" && profile?.name) {
            frappe.set_route("Form", "User", profile.name);
        } else if (action === "password") {
            frappe.set_route("update-password");
        } else if (action === "settings") {
            frappe.set_route("Form", "User", frappe.session.user);
        } else if (action === "logout") {
            frappe.app.logout();
        }

        root.find(".hd-profile-menu").prop("hidden", true);
        root.find(".hd-profile-button").attr("aria-expanded", "false");
    });
}

function setupLauncherSearch(wrapper) {
    const root = $(wrapper);

    root.off("input.hdLauncherSearch");
    root.on(
        "input.hdLauncherSearch",
        ".hd-launcher-search-input",
        function () {
            renderLauncherGroups(
                root.find(".hd-launcher-grid"),
                wrapper.haleel_launcher?.groups || [],
                this.value
            );
        }
    );

    root.off("keydown.hdLauncherSearch");
    root.on("keydown.hdLauncherSearch", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            root.find(".hd-launcher-search-input").trigger("focus");
        }

        if (event.key === "Escape") {
            const input = root.find(".hd-launcher-search-input");
            input.val("");
            input.trigger("input");
            input.trigger("blur");
        }
    });
}

function loadLauncher(wrapper) {
    const state = wrapper.haleel_launcher;

    if (!state) return;

    const root = $(wrapper);
    const grid = root.find(".hd-launcher-grid");

    document.body.classList.add("hd-launcher-active");

    grid.html(`
        <div class="hd-launcher-loading">
            ${__("Loading your applications...")}
        </div>
    `);

    Promise.all([
        frappe.call({
            method: "haleel_design.api.get_navigation",
        }),
        frappe.call({
            method: "haleel_design.api.get_current_user_profile",
        }),
    ])
        .then(([navigationResponse, profileResponse]) => {
            const groups = navigationResponse.message || [];
            const profile = profileResponse.message || {};

            state.profile = profile;
            state.groups = groups;

            renderLauncherProfile(root, profile);

            renderLauncherGroups(
                grid,
                groups,
                root.find(".hd-launcher-search-input").val() || ""
            );

            state.loaded = true;
        })
        .catch((error) => {
            console.error("Haleel Launcher loading failed:", error);

            grid.html(`
                <div class="hd-launcher-error">
                    <div class="hd-state-icon">!</div>
                    <h3>${__("Unable to load applications")}</h3>
                    <p>${__("Please refresh the page or contact your administrator.")}</p>
                    <button type="button" class="btn btn-primary hd-retry">
                        ${__("Try Again")}
                    </button>
                </div>
            `);
        });

    grid.off("click.hdRetry").on("click.hdRetry", ".hd-retry", function () {
        loadLauncher(wrapper);
    });
}

function renderLauncherProfile(root, profile) {
    const fullName = profile.full_name || profile.name || __("User");
    const image = profile.image;

    const avatar = image
        ? `<img src="${hdEscapeHTML(image)}" alt="">`
        : hdEscapeHTML(fullName.trim().charAt(0).toUpperCase());

    root.find(".hd-profile-avatar").html(avatar);
    root.find(".hd-profile-name").text(fullName);
}

function getLauncherIcon(group) {
    if (window.HaleelIcons && typeof window.HaleelIcons.render === "function") {
        return window.HaleelIcons.render(group.title || group.name);
    }

    return `<span class="hd-card-fallback">H</span>`;
}

function getLauncherColorClass(group) {
    const colors = [
        "teal",
        "blue",
        "purple",
        "orange",
        "green",
        "pink",
        "indigo",
        "amber",
    ];

    const value = String(group.name || group.title || "haleel");
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }

    return colors[Math.abs(hash) % colors.length];
}

function renderLauncherGroups(grid, groups, searchTerm = "") {
    const term = String(searchTerm || "").trim().toLowerCase();

    const filteredGroups = groups.filter((group) => {
        const title = String(group.title || group.name || "").toLowerCase();
        return title.includes(term);
    });

    grid.closest(".hd-launcher-content")
        .find(".hd-launcher-count")
        .text(
            term
                ? `${filteredGroups.length} ${__("results")}`
                : `${groups.length} ${__("applications")}`
        );

    if (!groups.length) {
        grid.html(`
            <div class="hd-launcher-empty">
                <div class="hd-state-icon">⌂</div>
                <h3>${__("No applications assigned")}</h3>
                <p>${__("Please contact your administrator to request access.")}</p>
            </div>
        `);
        return;
    }

    if (!filteredGroups.length) {
        grid.html(`
            <div class="hd-launcher-empty">
                <div class="hd-state-icon">⌕</div>
                <h3>${__("No applications found")}</h3>
                <p>${__("Try another search term.")}</p>
            </div>
        `);
        return;
    }

    const cards = filteredGroups.map((group) => {
        const items = group.items || [];
        const enabled = items.length > 0;
        const title = hdEscapeHTML(group.title || group.name);
        const colorClass = getLauncherColorClass(group);
        const icon = getLauncherIcon(group);

        return `
            <button
                type="button"
                class="hd-launcher-card ${colorClass} ${enabled ? "" : "is-disabled"}"
                ${enabled ? "" : "disabled"}
                data-route="${enabled ? hdEscapeHTML(JSON.stringify(items[0].route)) : ""}"
                data-workspace="${enabled ? hdEscapeHTML(group.name) : ""}"
                title="${enabled ? title : __("No authorized items in this group")}"
            >
                <span class="hd-card-icon">${icon}</span>
                <span class="hd-card-title">${title}</span>
                <span class="hd-card-description">
                    ${enabled
                        ? __("Open application")
                        : __("Access not configured")}
                </span>
                <span class="hd-card-arrow" aria-hidden="true">↗</span>
            </button>
        `;
    }).join("");

    grid.html(cards);

    grid.off("click.hdCard").on(
        "click.hdCard",
        ".hd-launcher-card:not(.is-disabled)",
        function (event) {
            event.preventDefault();
            event.stopPropagation();

            try {
                const route = JSON.parse(
                    this.getAttribute("data-route") || "null"
                );

                const workspace = this.getAttribute("data-workspace");

                if (!Array.isArray(route) || route.length === 0) {
                    console.error(
                        "[Haleel Launcher] Application has no valid first route."
                    );
                    return;
                }

                if (workspace) {
                    sessionStorage.setItem(
                        "hd-active-workspace",
                        workspace
                    );
                }

                frappe.set_route(...route);
            } catch (error) {
                console.error(
                    "[Haleel Launcher] Application navigation failed:",
                    error
                );
            }
        }
    );
}