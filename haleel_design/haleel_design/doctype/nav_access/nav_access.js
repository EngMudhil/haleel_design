frappe.ui.form.on("Nav Access", {
    refresh(frm) {
        if (frm.is_new()) return;

        frm.add_custom_button(
            __("Configure Navigation Items"),
            () => open_navigation_dialog(frm)
        );
    },
});


async function open_navigation_dialog(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __("Configure Navigation Items"),
        fields: [
            {
                fieldname: "nav_group",
                label: __("Navigation Group"),
                fieldtype: "Link",
                options: "Nav Group",
                reqd: 1,
                onchange: async function () {
                    const group_name = dialog.get_value("nav_group");

                    if (!group_name) {
                        dialog.set_df_property("allowed_items", "options", []);
                        dialog.set_value("allowed_items", []);
                        return;
                    }

                    try {
                        const response = await frappe.call({
                            method: "frappe.client.get",
                            args: {
                                doctype: "Nav Group",
                                name: group_name,
                            },
                        });

                        const group = response.message;
                        const items = (group.navigation_items || [])
                            .filter(item => item.is_visible);

                        dialog.set_df_property(
                            "allowed_items",
                            "options",
                            items.map(item => ({
                                label: item.name1,
                                value: item.name,
                            }))
                        );

                        dialog.set_value(
                            "allowed_items",
                            get_saved_items(frm, group_name)
                        );
                    } catch (error) {
                        console.error(error);
                        frappe.msgprint(
                            __("Could not load navigation items.")
                        );
                    }
                },
            },
            {
                fieldname: "allowed_items",
                label: __("Items This User Can See"),
                fieldtype: "MultiCheck",
                options: [],
                description: __(
                    "Select specific items, or leave everything unchecked to grant all visible items in this group."
                ),
            },
        ],
        primary_action_label: __("Save Selection"),

        primary_action: async function (values) {
            const group_name = values.nav_group;
            const selected_items = values.allowed_items || [];

            // Preserve assignments belonging to other groups.
            const other_rows = (frm.doc.workspaces || [])
                .filter(row => row.nav_group !== group_name)
                .map(row => ({
                    nav_group: row.nav_group,
                    nav_item: row.nav_item,
                }));

            frm.clear_table("workspaces");

            other_rows.forEach(item => {
                const row = frm.add_child("workspaces");
                row.nav_group = item.nav_group;
                row.nav_item = item.nav_item;
            });

            if (selected_items.length === 0) {
                // Blank item means all visible items in this group.
                const row = frm.add_child("workspaces");
                row.nav_group = group_name;
                row.nav_item = "";
            } else {
                selected_items.forEach(item_name => {
                    const row = frm.add_child("workspaces");
                    row.nav_group = group_name;
                    row.nav_item = item_name;
                });
            }

            frm.refresh_field("workspaces");

            try {
                await frm.save();
                dialog.hide();

                frappe.show_alert({
                    message: __("Navigation selection saved"),
                    indicator: "green",
                });
            } catch (error) {
                console.error(error);
                frappe.msgprint(
                    __("Could not save the selection. Check the browser console.")
                );
            }
        },
    });

    dialog.show();

    // Restore a previously configured group when possible.
    const first_group = (frm.doc.workspaces || []).find(
        row => row.nav_group
    );

    if (first_group) {
        dialog.set_value("nav_group", first_group.nav_group);
    }
}


function get_saved_items(frm, group_name) {
    return (frm.doc.workspaces || [])
        .filter(row => row.nav_group === group_name && row.nav_item)
        .map(row => row.nav_item);
}
