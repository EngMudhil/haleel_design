
import frappe
from frappe import _


def _enabled(value):
    return value not in (0, "0", False, None)


def _has_required_roles(doc, user):
    """Check whether the user has at least one required role."""
    required_roles = {
        row.get("role")
        for row in (doc.get("roles") or [])
        if row.get("role")
    }

    if not required_roles:
        return True

    return bool(required_roles.intersection(frappe.get_roles(user)))


def _get_user_group_access(user):
    """
    Return application access for a user.

    None = all visible items in a group.
    set() = only explicitly assigned items.
    """
    is_administrator = user == "Administrator"

    if is_administrator:
        group_names = frappe.get_all(
            "Nav Group",
            filters={"is_active": 1},
            pluck="name",
            order_by="group_title asc",
        )
        return {name: None for name in group_names}

    records = frappe.get_all(
        "Nav Access",
        filters={"user": user},
        fields=["name"],
        limit_page_length=100,
    )

    group_access = {}

    for record in records:
        access = frappe.get_doc("Nav Access", record.name)

        if not _enabled(access.get("is_active", 1)):
            continue

        for selected in access.get("workspaces") or []:
            group_name = str(
                selected.get("nav_group") or ""
            ).strip()

            item_name = str(
                selected.get("nav_item") or ""
            ).strip()

            if not group_name:
                continue

            if not item_name:
                group_access[group_name] = None
                continue

            if group_name not in group_access:
                group_access[group_name] = set()

            if group_access[group_name] is not None:
                group_access[group_name].add(item_name)

    return group_access


def _make_route(item_type, destination, user, is_administrator=False):
    """Validate a destination and build its Frappe route."""
    item_type = str(item_type or "").strip().lower()
    destination = str(destination or "").strip()

    if not destination:
        return None

    if item_type == "doctype":
        if not frappe.db.exists("DocType", destination):
            return None

        if not is_administrator:
            if not frappe.has_permission(
                destination, "read", user=user
            ):
                return None

        return ["List", destination]

    if item_type == "report":
        if not frappe.db.exists("Report", destination):
            return None

        report = frappe.get_doc("Report", destination)

        if not is_administrator:
            if not _has_required_roles(report, user):
                return None

            ref_doctype = report.get("ref_doctype")

            if ref_doctype and not frappe.has_permission(
                ref_doctype, "read", user=user
            ):
                return None

        return ["query-report", destination]

    if item_type == "page":
        if not frappe.db.exists("Page", destination):
            return None

        page = frappe.get_doc("Page", destination)

        if not is_administrator:
            if not _has_required_roles(page, user):
                return None

        return [destination]

    return None


def _get_group_items(group, user, selected_names=None):
    """Return authorized and visible items in a navigation group."""
    is_administrator = user == "Administrator"
    items = []

    for row in group.get("navigation_items") or []:
        if not _enabled(row.get("is_visible", 1)):
            continue

        row_name = str(row.get("name") or "").strip()
        label = str(row.get("name1") or "").strip()

        if selected_names is not None:
            if (
                row_name not in selected_names
                and label not in selected_names
            ):
                continue

        item_type = str(
            row.get("item_type") or ""
        ).strip().lower()

        destination = str(
            row.get("destination") or ""
        ).strip()

        route = _make_route(
            item_type,
            destination,
            user,
            is_administrator=is_administrator,
        )

        if not route:
            continue

        items.append({
            "name": row_name or label,
            "label": label or destination,
            "type": item_type,
            "destination": destination,
            "route": route,
            "is_visible": 1,
        })

    return items


def _get_accessible_groups(user):
    """Return active application groups and their authorized items."""
    group_access = _get_user_group_access(user)
    result = []

    for group_name, selected_names in group_access.items():
        if not frappe.db.exists("Nav Group", group_name):
            continue

        group = frappe.get_doc("Nav Group", group_name)

        if not _enabled(group.get("is_active", 1)):
            continue

        items = _get_group_items(
            group,
            user,
            selected_names=selected_names,
        )

        result.append({
            "name": group.name,
            "title": group.get("group_title") or group.name,
            "icon": group.get("group_icon") or "",
            "items": items,
        })

    return result


def _require_logged_in_user():
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(
            _("Please log in first."),
            frappe.PermissionError,
        )

    return user


@frappe.whitelist()
def get_navigation():
    """
    Backward-compatible API.

    Returns all accessible application groups and their items.
    """
    user = _require_logged_in_user()
    return _get_accessible_groups(user)


@frappe.whitelist()
def get_applications():
    """
    Return applications available to the current user.

    The first direct DocType/Page item becomes the default
    landing route. Reports are not used as the preferred
    application landing page.
    """
    user = _require_logged_in_user()
    groups = _get_accessible_groups(user)

    applications = []

    for group in groups:
        items = group.get("items") or []

        if not items:
            continue

        landing_item = next(
            (
                item for item in items
                if item.get("type") in ("doctype", "page")
            ),
            items[0],
        )

        applications.append({
            "name": group["name"],
            "title": group["title"],
            "icon": group["icon"],
            "landing_route": landing_item["route"],
            "items": items,
        })

    return applications


@frappe.whitelist()
def get_application_navigation(application):
    """
    Return navigation for one authorized application.

    DocType and Page items are direct links.
    All Report items are grouped into one Reports dropdown.
    """
    user = _require_logged_in_user()

    application = str(application or "").strip()

    if not application:
        frappe.throw(_("Application is required."))

    group_access = _get_user_group_access(user)

    if application not in group_access:
        frappe.throw(
            _("You do not have access to this application."),
            frappe.PermissionError,
        )

    if not frappe.db.exists("Nav Group", application):
        frappe.throw(_("Application does not exist."))

    group = frappe.get_doc("Nav Group", application)

    if not _enabled(group.get("is_active", 1)):
        frappe.throw(
            _("This application is inactive."),
            frappe.PermissionError,
        )

    items = _get_group_items(
        group,
        user,
        selected_names=group_access[application],
    )

    direct_links = []
    reports = []

    for item in items:
        if item["type"] == "report":
            reports.append(item)
        else:
            direct_links.append(item)

    landing_item = next(
        (
            item for item in direct_links
            if item["type"] in ("doctype", "page")
        ),
        direct_links[0] if direct_links else (
            reports[0] if reports else None
        ),
    )

    navigation = direct_links.copy()

    if reports:
        navigation.append({
            "name": "reports",
            "label": "Reports",
            "type": "dropdown",
            "items": reports,
        })

    return {
        "application": group.name,
        "title": group.get("group_title") or group.name,
        "icon": group.get("group_icon") or "",
        "landing_route": (
            landing_item["route"] if landing_item else None
        ),
        "navigation": navigation,
    }


@frappe.whitelist()
def get_current_user_profile():
    """Return the current user's basic profile."""
    user = _require_logged_in_user()

    doc = frappe.get_doc("User", user)

    return {
        "name": doc.name,
        "full_name": doc.full_name or doc.name,
        "email": doc.email or "",
        "image": doc.user_image or "",
    }
