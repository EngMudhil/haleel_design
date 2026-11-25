(function () {
    "use strict";

    const exact = {
        "dashboard": "squares-four",
        "home": "house",
        "sales": "shopping-cart",
        "selling": "shopping-cart",
        "purchase": "shopping-bag",
        "buying": "shopping-bag",
        "stock": "package",
        "inventory": "warehouse",
        "warehouse": "warehouse",
        "accounts": "wallet",
        "accounting": "wallet",
        "finance": "wallet",
        "hr": "users-three",
        "human resources": "users-three",
        "employees": "users-three",
        "staff": "users-three",
        "payroll": "money",
        "crm": "handshake",
        "customer relationship management": "handshake",
        "manufacturing": "factory",
        "production": "factory",
        "reports": "chart-bar",
        "analytics": "chart-line",
        "projects": "kanban",
        "support": "headset",
        "help desk": "headset",
        "settings": "gear",
        "administration": "gear",
        "users": "users",
        "navigation": "list",
        "applications": "squares-four"
    };

    const keywords = [
        { words: ["dashboard", "overview"], icon: "squares-four" },
        { words: ["sale", "selling", "invoice"], icon: "shopping-cart" },
        { words: ["purchase", "supplier", "buying"], icon: "shopping-bag" },
        { words: ["stock", "item", "product"], icon: "package" },
        { words: ["warehouse", "inventory"], icon: "warehouse" },
        { words: ["account", "finance", "ledger"], icon: "wallet" },
        { words: ["employee", "human resource", "staff"], icon: "users-three" },
        { words: ["payroll", "salary"], icon: "money" },
        { words: ["customer", "relationship", "crm"], icon: "handshake" },
        { words: ["manufacturing", "production"], icon: "factory" },
        { words: ["report", "analytics", "insight"], icon: "chart-bar" },
        { words: ["project", "task"], icon: "kanban" },
        { words: ["support", "ticket", "help desk"], icon: "headset" },
        { words: ["setting", "configuration", "admin"], icon: "gear" },
        { words: ["user", "people", "team"], icon: "users-three" }
    ];

    const allowed = new Set([
        "squares-four", "house", "shopping-cart", "shopping-bag",
        "package", "warehouse", "wallet", "users-three", "money",
        "handshake", "factory", "chart-bar", "chart-line", "kanban",
        "headset", "gear", "users", "list", "shapes"
    ]);

    function normalize(value) {
        return String(value || "")
            .normalize("NFKD")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function resolve(title) {
        const normalized = normalize(title);

        if (exact[normalized]) {
            return exact[normalized];
        }

        for (const entry of keywords) {
            if (entry.words.some(word => normalized.includes(word))) {
                return entry.icon;
            }
        }

        return "shapes";
    }

    function render(title, options = {}) {
        const icon = resolve(title);
        const weight = options.weight === "fill" ? "fill" : "regular";
        const prefix = weight === "fill" ? "ph-fill" : "ph";

        if (!allowed.has(icon)) {
            return '<i class="ph ph-shapes" aria-hidden="true"></i>';
        }

        return `<i class="${prefix} ph-${icon}" aria-hidden="true"></i>`;
    }

    window.HaleelIcons = Object.freeze({
        resolve,
        render
    });
})();
