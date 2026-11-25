app_name = "haleel_design"
app_title = "Haleel Design"
app_publisher = "Haleel Technology"
app_description = "Custom design system and workspace for Haleel Technology"
app_email = "princewehliye93@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "haleel_design",
# 		"logo": "/assets/haleel_design/logo.png",
# 		"title": "Haleel Design",
# 		"route": "/haleel_design",
# 		"has_permission": "haleel_design.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = [
    "/assets/haleel_design/vendor/phosphor/regular/style.css",
    "/assets/haleel_design/vendor/phosphor/fill/style.css",
    "/assets/haleel_design/css/tailwind.bundle.css",
    "/assets/haleel_design/css/haleel_design.css",
    "/assets/haleel_design/css/haleel_launcher_home.css",
]
app_include_js = [
    "/assets/haleel_design/js/haleel_icons.js",
    "/assets/haleel_design/js/haleel_design.js",
    "/assets/haleel_design/js/haleel_launcher_home.js",
]

# include js, css files in header of web template
# web_include_css = "/assets/haleel_design/css/haleel_design.css"
# web_include_js = "/assets/haleel_design/js/haleel_design.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "haleel_design/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "haleel_design/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "haleel_design.utils.jinja_methods",
# 	"filters": "haleel_design.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "haleel_design.install.before_install"
# after_install = "haleel_design.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "haleel_design.uninstall.before_uninstall"
# after_uninstall = "haleel_design.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "haleel_design.utils.before_app_install"
# after_app_install = "haleel_design.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "haleel_design.utils.before_app_uninstall"
# after_app_uninstall = "haleel_design.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "haleel_design.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["haleel_design.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"haleel_design.tasks.all"
# 	],
# 	"daily": [
# 		"haleel_design.tasks.daily"
# 	],
# 	"hourly": [
# 		"haleel_design.tasks.hourly"
# 	],
# 	"weekly": [
# 		"haleel_design.tasks.weekly"
# 	],
# 	"monthly": [
# 		"haleel_design.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "haleel_design.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "haleel_design.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "haleel_design.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["haleel_design.utils.before_request"]
# after_request = ["haleel_design.utils.after_request"]

# Job Events
# ----------
# before_job = ["haleel_design.utils.before_job"]
# after_job = ["haleel_design.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"haleel_design.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

