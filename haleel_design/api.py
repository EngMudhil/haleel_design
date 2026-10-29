
import frappe
from frappe import _


def _enabled(value):
    return value not in (0, "0", False, None)


def _make_route(item_type, destination):
    item_type = str(item_type or "").strip().lower()
    destination = str(destination or "").strip()

    if not destination:
        return None

    if item_type == "doctype":
        if not frappe.db.exists("DocType", destination):
            return None
        return ["List", destination]

    if item_type == "report":
        if not frappe.db.exists("Report", destination):
            return None
        return ["query-report", destination]

    if item_type == "page":
        if not frappe.db.exists("Page", destination):
            return None
        return [destination]

    return None


@frappe.whitelist()
def get_navigation():
    """Return active navigation groups assigned to the current user."""
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(_("Please log in first."), frappe.PermissionError)

    records = frappe.get_all(
        "Nav Access",
        filters={"user": user},
        fields=["name"],
        limit_page_length=100,
    )

    # Empty nav_item means all visible items in the assigned group.
    group_access = {}

    for record in records:
        access = frappe.get_doc("Nav Access", record.name)

        if not _enabled(access.get("is_active", 1)):
            continue

        for selected in access.get("workspaces") or []:
            group_name = str(selected.get("nav_group") or "").strip()
            item_name = str(selected.get("nav_item") or "").strip()

            if not group_name:
                continue

            group_access.setdefault(group_name, set())

            if item_name:
                group_access[group_name].add(item_name)

    result = []

    for group_name, selected_names in group_access.items():
        if not frappe.db.exists("Nav Group", group_name):
            continue

        group = frappe.get_doc("Nav Group", group_name)

        if not _enabled(group.get("is_active", 1)):
            continue

        items = []

        for row in group.get("navigation_items") or []:
            if not _enabled(row.get("is_visible", 1)):
                continue

            row_name = str(row.get("name") or "").strip()
            label = str(row.get("name1") or "").strip()

            if selected_names and (
                row_name not in selected_names
                and label not in selected_names
            ):
                continue

            item_type = str(row.get("item_type") or "").strip().lower()
            destination = str(row.get("destination") or "").strip()
            route = _make_route(item_type, destination)

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

        if items:
            result.append({
                "name": group.name,
                "title": group.get("group_title") or group.name,
                "icon": group.get("group_icon") or "",
                "items": items,
            })

    return result


@frappe.whitelist()
def get_current_user_profile():
    """Return the current user's basic profile."""
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(_("Please log in first."), frappe.PermissionError)

    doc = frappe.get_doc("User", user)

    return {
        "name": doc.name,
        "full_name": doc.full_name or doc.name,
        "email": doc.email or "",
        "image": doc.user_image or "",
    }
