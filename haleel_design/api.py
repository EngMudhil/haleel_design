
import frappe
from frappe import _


def _is_visible(value):
    return value not in (0, "0", False, None)


def _route_for(item_type, destination):
    item_type = str(item_type or "").strip().lower()
    destination = str(destination or "").strip()

    if not destination:
        return None

    if item_type == "doctype":
        return ["List", destination]

    if item_type == "report":
        return ["query-report", destination]

    if item_type == "page":
        return [destination]

    return None


@frappe.whitelist()
def get_navigation():
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(
            _("Please log in to access navigation."),
            frappe.PermissionError,
        )

    access_records = frappe.get_all(
        "Nav Access",
        filters={"user": user},
        fields=["name"],
        limit_page_length=100,
    )

    groups_allowed = set()
    items_allowed = {}

    for record in access_records:
        access = frappe.get_doc("Nav Access", record.name)

        if not _is_visible(access.get("is_active", 1)):
            continue

        for row in access.get("workspaces") or []:
            group_name = row.get("nav_group")
            item_name = row.get("nav_item")

            if group_name:
                groups_allowed.add(group_name)

                if item_name:
                    items_allowed.setdefault(
                        group_name, set()
                    ).add(item_name)

    result = []

    for group_name in sorted(groups_allowed):
        if not frappe.db.exists("Nav Group", group_name):
            continue

        group = frappe.get_doc("Nav Group", group_name)

        if not _is_visible(group.get("is_active", 1)):
            continue

        items = []
        selected_items = items_allowed.get(group_name, set())

        for row in group.get("navigation_items") or []:
            if not _is_visible(row.get("is_visible", 1)):
                continue

            item_type = row.get("item_type")
            destination = row.get("destination")
            linked_item = row.get("nav_item")

            if linked_item and (
                not item_type or not destination
            ):
                if frappe.db.exists("Nav Item", linked_item):
                    linked = frappe.get_doc(
                        "Nav Item", linked_item
                    )

                    item_type = (
                        item_type or linked.get("item_type")
                    )
                    destination = (
                        destination or linked.get("destination")
                    )

            if selected_items and linked_item:
                if linked_item not in selected_items:
                    continue

            route = _route_for(item_type, destination)

            if not route:
                continue

            label = (
                row.get("label")
                or row.get("name1")
                or row.get("item_label")
                or destination
            )

            items.append({
                "label": label,
                "type": item_type,
                "destination": destination,
                "route": route,
                "is_visible": 1,
            })

        if items:
            result.append({
                "name": group.name,
                "title": (
                    group.get("group_title") or group.name
                ),
                "icon": group.get("group_icon") or "",
                "items": items,
            })

    return result


@frappe.whitelist()
def get_current_user_profile():
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(
            _("Please log in first."),
            frappe.PermissionError,
        )

    doc = frappe.get_doc("User", user)

    return {
        "name": doc.name,
        "full_name": doc.full_name or doc.name,
        "email": doc.email or "",
        "image": doc.user_image or "",
    }
