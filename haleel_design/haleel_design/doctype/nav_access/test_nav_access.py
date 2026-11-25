# Copyright (c) 2026, Haleel Technology and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from haleel_design.api.api import get_navigation


def _delete_if_exists(doctype, name):
	if name and frappe.db.exists(doctype, name):
		frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)


class TestGetNavigation(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.group_name = "_Haleel Nav Test Group"
		cls.user_a = "haleel_nav_a@example.com"
		cls.user_b = "haleel_nav_b@example.com"
		cls.role_name = "_Haleel Nav Test Role"
		cls.report_name = "_Haleel Nav Restricted Report"
		# Existing System-Manager page; avoid creating Pages (requires developer_mode).
		cls.page_name = "permission-manager"

	def setUp(self):
		self._cleanup_fixtures()
		self._create_role()
		self._create_users()
		self._create_restricted_destinations()
		self._create_nav_group()
		self.addCleanup(self._cleanup_fixtures)

	def _cleanup_fixtures(self):
		frappe.set_user("Administrator")

		for user in (self.user_a, self.user_b):
			_delete_if_exists("Nav Access", user)
			_delete_if_exists("User", user)

		_delete_if_exists("Nav Group", self.group_name)
		_delete_if_exists("Report", self.report_name)
		_delete_if_exists("Role", self.role_name)

	def _create_role(self):
		if frappe.db.exists("Role", self.role_name):
			return
		frappe.get_doc({
			"doctype": "Role",
			"role_name": self.role_name,
			"desk_access": 1,
		}).insert(ignore_permissions=True)

	def _create_users(self):
		for email, first_name in (
			(self.user_a, "Haleel Nav A"),
			(self.user_b, "Haleel Nav B"),
		):
			user = frappe.get_doc({
				"doctype": "User",
				"email": email,
				"first_name": first_name,
				"send_welcome_email": 0,
			}).insert(ignore_permissions=True)
			user.append("roles", {"role": self.role_name})
			user.append("roles", {"role": "Desk User"})
			user.save(ignore_permissions=True)

	def _create_restricted_destinations(self):
		frappe.get_doc({
			"doctype": "Report",
			"report_name": self.report_name,
			"ref_doctype": "ToDo",
			"report_type": "Report Builder",
			"is_standard": "No",
			"disabled": 0,
			"roles": [{"role": "System Manager"}],
		}).insert(ignore_permissions=True)

		self.assertTrue(
			frappe.db.exists("Page", self.page_name),
			f"Expected built-in Page {self.page_name} to exist",
		)

	def _create_nav_group(self, *, include_invisible=True, active=True):
		items = [
			{
				"name1": "_Haleel Item ToDo",
				"item_type": "DocType",
				"destination": "ToDo",
				"is_visible": 1,
			},
			{
				"name1": "_Haleel Item Note",
				"item_type": "DocType",
				"destination": "Note",
				"is_visible": 1,
			},
			{
				"name1": "_Haleel Item Report",
				"item_type": "Report",
				"destination": self.report_name,
				"is_visible": 1,
			},
			{
				"name1": "_Haleel Item Page",
				"item_type": "Page",
				"destination": self.page_name,
				"is_visible": 1,
			},
			{
				"name1": "_Haleel Item Missing",
				"item_type": "DocType",
				"destination": "_Haleel Does Not Exist XYZ",
				"is_visible": 1,
			},
		]

		if include_invisible:
			items.append({
				"name1": "_Haleel Item Invisible",
				"item_type": "DocType",
				"destination": "ToDo",
				"is_visible": 0,
			})

		doc = frappe.get_doc({
			"doctype": "Nav Group",
			"group_title": self.group_name,
			"group_icon": "folder",
			"is_active": 1 if active else 0,
			"navigation_items": items,
		})
		# Allow a deliberately invalid destination for exclusion tests.
		doc.flags.ignore_links = True
		doc.insert(ignore_permissions=True)
		self.nav_group = doc
		self.item_by_label = {
			row.name1: row.name for row in doc.navigation_items
		}
		return doc

	def _item_id(self, label):
		"""Return the stored Nav Item child name for a name1 label."""
		item_id = self.item_by_label.get(label)
		self.assertTrue(item_id, f"Missing Nav Item fixture for {label}")
		return item_id

	def _grant_access(self, user, item_labels, *, active=True, group_only=False):
		"""Create Nav Access. item_labels are Nav Item name1 labels from the fixture."""
		_delete_if_exists("Nav Access", user)

		workspaces = []
		if group_only:
			workspaces.append({
				"nav_group": self.group_name,
				"nav_item": "",
			})
		else:
			for label in item_labels:
				workspaces.append({
					"nav_group": self.group_name,
					"nav_item": self._item_id(label),
				})

		doc = frappe.get_doc({
			"doctype": "Nav Access",
			"user": user,
			"is_active": 1 if active else 0,
			"workspaces": workspaces,
		})
		doc.flags.ignore_links = True
		doc.insert(ignore_permissions=True)
		return doc

	def _item_destinations(self, result):
		destinations = []
		for group in result:
			for item in group.get("items") or []:
				destinations.append(item.get("destination"))
		return destinations

	def _item_routes(self, result):
		routes = []
		for group in result:
			for item in group.get("items") or []:
				routes.append(item.get("route"))
		return routes

	def test_single_item_grant(self):
		self._grant_access(self.user_a, ["_Haleel Item ToDo"])

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(len(result), 1)
		self.assertEqual(result[0]["name"], self.group_name)
		self.assertEqual(self._item_destinations(result), ["ToDo"])
		self.assertEqual(self._item_routes(result), [["List", "ToDo"]])

	def test_multiple_item_grant(self):
		self._grant_access(
			self.user_a,
			["_Haleel Item ToDo", "_Haleel Item Note"],
		)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(
			sorted(self._item_destinations(result)),
			["Note", "ToDo"],
		)

	def test_all_visible_items_explicitly_granted(self):
		group = frappe.get_doc("Nav Group", self.group_name)
		visible_names = [
			row.name
			for row in group.navigation_items
			if row.is_visible and row.destination in ("ToDo", "Note")
		]
		# Grant every visible DocType item the test user can open.
		self._grant_access(self.user_a, visible_names)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(
			sorted(self._item_destinations(result)),
			["Note", "ToDo"],
		)

	def test_group_only_row_grants_nothing(self):
		self._grant_access(self.user_a, [], group_only=True)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(result, [])

	def test_empty_selection_no_rows_for_group(self):
		# Nav Access exists but workspaces empty
		frappe.get_doc({
			"doctype": "Nav Access",
			"user": self.user_a,
			"is_active": 1,
			"workspaces": [],
		}).insert(ignore_permissions=True)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(result, [])

	def test_inactive_nav_access(self):
		self._grant_access(
			self.user_a,
			["_Haleel Item ToDo"],
			active=False,
		)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(result, [])

	def test_inactive_nav_group(self):
		frappe.db.set_value("Nav Group", self.group_name, "is_active", 0)
		self._grant_access(self.user_a, ["_Haleel Item ToDo"])

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(result, [])

	def test_invisible_nav_item_excluded(self):
		self._grant_access(
			self.user_a,
			["_Haleel Item Invisible", "_Haleel Item ToDo"],
		)

		with self.set_user(self.user_a):
			result = get_navigation()

		labels = [
			item["label"]
			for group in result
			for item in group["items"]
		]
		self.assertNotIn("_Haleel Item Invisible", labels)
		self.assertEqual(self._item_destinations(result), ["ToDo"])

	def test_user_without_nav_access(self):
		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(result, [])

	def test_guest_denied(self):
		with self.set_user("Guest"):
			with self.assertRaises(frappe.PermissionError):
				get_navigation()

	def test_unauthorized_destination_excluded(self):
		# Restricted report requires System Manager; Desk User must not see it.
		self._grant_access(
			self.user_a,
			["_Haleel Item ToDo", "_Haleel Item Report", "_Haleel Item Page"],
		)

		with self.set_user(self.user_a):
			result = get_navigation()

		destinations = self._item_destinations(result)
		self.assertIn("ToDo", destinations)
		self.assertNotIn(self.report_name, destinations)
		self.assertNotIn(self.page_name, destinations)

	def test_missing_destination_excluded(self):
		self._grant_access(
			self.user_a,
			["_Haleel Item Missing", "_Haleel Item ToDo"],
		)

		with self.set_user(self.user_a):
			result = get_navigation()

		self.assertEqual(self._item_destinations(result), ["ToDo"])

	def test_user_isolation(self):
		self._grant_access(self.user_a, ["_Haleel Item ToDo"])
		self._grant_access(self.user_b, ["_Haleel Item Note"])

		with self.set_user(self.user_a):
			result_a = get_navigation()

		with self.set_user(self.user_b):
			result_b = get_navigation()

		self.assertEqual(self._item_destinations(result_a), ["ToDo"])
		self.assertEqual(self._item_destinations(result_b), ["Note"])

	def test_route_formats(self):
		# Administrator can open DocType, restricted Report, and Page.
		self._grant_access(
			"Administrator",
			[
				"_Haleel Item ToDo",
				"_Haleel Item Report",
				"_Haleel Item Page",
			],
		)

		# Nav Access autoname is field:user — Administrator document name is the user id.
		with self.set_user("Administrator"):
			result = get_navigation()

		routes = {
			tuple(item["route"]): item["destination"]
			for group in result
			for item in group["items"]
			if item["destination"]
			in ("ToDo", self.report_name, self.page_name)
		}

		self.assertEqual(routes.get(("List", "ToDo")), "ToDo")
		self.assertEqual(
			routes.get(("query-report", self.report_name)),
			self.report_name,
		)
		self.assertEqual(
			routes.get((self.page_name,)),
			self.page_name,
		)

		_delete_if_exists("Nav Access", "Administrator")
