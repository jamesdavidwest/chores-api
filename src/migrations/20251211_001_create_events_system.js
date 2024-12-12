// migrations/001_create_comprehensive_events_system.js

exports.up = function (knex) {
  return (
    knex.schema
      // Core events table
      .createTable("events", (table) => {
        // Base fields
        table.increments("id").primary();
        table.string("title").notNullable();
        table.text("description");

        // References
        table.integer("location_id").references("id").inTable("locations");
        table.integer("category_id").references("id").inTable("categories");
        table
          .integer("frequency_id")
          .references("id")
          .inTable("frequency_types");
        table.integer("assigned_to").references("id").inTable("users");
        table
          .integer("template_id")
          .references("id")
          .inTable("event_templates");

        // User tracking
        table
          .integer("assigned_by")
          .references("id")
          .inTable("users")
          .notNullable();
        table
          .integer("created_by")
          .references("id")
          .inTable("users")
          .notNullable();
        table.integer("updated_by").references("id").inTable("users");
        table.integer("deleted_by").references("id").inTable("users");

        // Timing
        table.time("time_preference").defaultTo("12:00:00");
        table.timestamp("effective_date");
        table.timestamp("expiration_date");
        table.integer("grace_period").defaultTo(0);
        table.integer("reminder_threshold").defaultTo(null);
        table.integer("max_duration").defaultTo(null);
        table.integer("min_duration").defaultTo(null);

        // Priority and Escalation
        table.integer("priority").defaultTo(2);
        table.integer("escalation_level").defaultTo(0);
        table.json("escalation_rules");
        table.integer("escalation_threshold_minutes");
        table.timestamp("last_escalated_at");
        table.integer("escalated_to").references("id").inTable("users");

        // Budget and Costs
        table.decimal("budget_allocated", 15, 2).defaultTo(0);
        table.decimal("cost_estimate", 15, 2).defaultTo(0);
        table.decimal("actual_cost", 15, 2).defaultTo(0);
        table.string("cost_center");
        table.json("budget_metadata");

        // Risk Assessment
        table.string("risk_level").defaultTo("low");
        table.integer("risk_score").defaultTo(0);
        table.json("risk_factors");
        table.text("risk_mitigation_plan");
        table.json("risk_history");

        // Validation and Acceptance
        table.json("validation_rules");
        table.json("acceptance_criteria");
        table.text("completion_requirements");
        table.boolean("requires_checklist").defaultTo(false);
        table.json("validation_metadata");

        // Status and State
        table.boolean("is_active").defaultTo(true);
        table.boolean("is_private").defaultTo(false);
        table.boolean("is_template").defaultTo(false);
        table.string("status").defaultTo("active");
        table.string("previous_status");
        table.timestamp("status_changed_at");
        table.integer("status_changed_by").references("id").inTable("users");
        table.json("state_transition_history");

        // Verification and Approval
        table.boolean("requires_verification").defaultTo(false);
        table.boolean("requires_approval").defaultTo(false);
        table.boolean("requires_location_verification").defaultTo(false);
        table.boolean("requires_photo_verification").defaultTo(false);
        table.integer("approval_level").defaultTo(1);
        table.string("approval_type").defaultTo("single");
        table.integer("approver_group_id").references("id").inTable("groups");

        // Completion Settings
        table.string("completion_type").defaultTo("single");
        table.boolean("allow_early_completion").defaultTo(true);
        table.boolean("allow_late_completion").defaultTo(true);
        table.boolean("auto_approve_subtasks").defaultTo(false);

        // Hierarchy
        table.integer("parent_event_id").references("id").inTable("events");
        table.integer("estimated_duration");
        table.integer("points_value").defaultTo(0);

        // Metadata and Custom Data
        table.json("metadata");
        table.text("notes");
        table.integer("complexity_score").defaultTo(1);
        table.string("external_id");
        table.string("external_source");
        table.timestamp("last_synced_at");
        table.string("sync_status");

        // Error Handling
        table.integer("retry_count").defaultTo(0);
        table.text("last_error");
        table.json("error_history");

        // Audit and Security
        table.timestamp("last_viewed_at");
        table.integer("view_count").defaultTo(0);
        table.string("last_accessed_from");
        table.string("compliance_level");
        table.string("data_classification");
        table.integer("retention_period");
        table.boolean("legal_hold").defaultTo(false);

        // Communication
        table.timestamp("last_notification_sent");
        table.json("notification_preferences");
        table.string("communication_channel_preference");

        // Cache Management
        table.string("cache_key");
        table.timestamp("last_cached_at");

        // Version Control
        table.integer("version").defaultTo(1);
        table.json("revision_history");
        table.string("last_modified_from");

        // Timestamps
        table.timestamps(true, true);
        table.timestamp("deleted_at");

        // Indexes
        table.index(["status", "is_active"]);
        table.index(["assigned_to", "status"]);
        table.index(["parent_event_id"]);
        table.index(["external_id"]);
        table.index(["created_at"]);
        table.index(["effective_date"]);
        table.index(["risk_level"]);
        table.index(["priority", "escalation_level"]);
      })

      // Event instances table
      .createTable("event_instances", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");

        // Timing
        table.date("start_date").notNullable();
        table.date("end_date").notNullable();
        table.time("start_time").defaultTo("12:00:00");
        table.time("end_time");
        table.integer("actual_duration");

        // Status and State
        table.string("status").defaultTo("active");
        table.string("completion_status").defaultTo("pending");
        table.boolean("skipped").defaultTo(false);
        table.text("skip_reason");

        // Completion Tracking
        table.integer("completed_by").references("id").inTable("users");
        table.integer("verified_by").references("id").inTable("users");
        table.integer("approved_by").references("id").inTable("users");
        table.timestamp("completed_at");
        table.timestamp("verified_at");
        table.timestamp("approved_at");

        // Verification Data
        table.text("completion_notes");
        table.json("verification_data");

        // Costs and Budget
        table.decimal("actual_cost", 15, 2);
        table.json("cost_details");

        // Audit
        table.json("modified_history");
        table.json("metadata");
        table
          .integer("parent_instance_id")
          .references("id")
          .inTable("event_instances");

        // Error Handling
        table.integer("retry_count").defaultTo(0);
        table.text("last_error");
        table.json("error_history");

        // Version Control
        table.integer("version").defaultTo(1);
        table.json("revision_history");

        // Security
        table.string("ip_address");
        table.string("user_agent");

        // Timestamps
        table.timestamps(true, true);
        table.timestamp("deleted_at");
        table.integer("deleted_by").references("id").inTable("users");

        // Indexes
        table.index(["event_id", "start_date", "end_date"]);
        table.index(["status"]);
        table.index(["completion_status"]);
        table.index(["start_date"]);
        table.index(["end_date"]);
      })

      // Instance ranges table
      .createTable("instance_ranges", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.date("start_date").notNullable();
        table.date("end_date").notNullable();
        table.integer("generated_count");
        table.json("generation_metadata");
        table
          .integer("generated_by")
          .references("id")
          .inTable("users")
          .notNullable();
        table.timestamp("generated_at").defaultTo(knex.fn.now());
        table.string("status").defaultTo("active");
        table.json("error_log");

        // Indexes
        table.index(["event_id"]);
        table.index(["start_date", "end_date"]);
      })

      // Event assignments table
      .createTable("event_assignments", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table
          .integer("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        table
          .integer("assigned_by")
          .references("id")
          .inTable("users")
          .notNullable();

        // Assignment Details
        table.string("role").defaultTo("assignee");
        table.json("permissions");
        table.boolean("is_mandatory").defaultTo(true);
        table.integer("order").defaultTo(0);
        table.boolean("can_reassign").defaultTo(false);
        table.boolean("can_delegate").defaultTo(false);

        // Status
        table.string("status").defaultTo("active");
        table.timestamp("accepted_at");
        table.timestamp("started_at");

        // Audit
        table.json("history");
        table.timestamps(true, true);

        // Constraints
        table.unique(["event_id", "user_id"]);
      })

      // Event dependencies table
      .createTable("event_dependencies", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table
          .integer("dependent_event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.string("dependency_type").defaultTo("blocks");
        table.boolean("is_mandatory").defaultTo(true);
        table.json("dependency_rules");
        table.timestamps(true, true);

        // Constraints
        table.unique(["event_id", "dependent_event_id"]);
      })

      // Event verifications table
      .createTable("event_verifications", (table) => {
        table.increments("id").primary();
        table
          .integer("instance_id")
          .references("id")
          .inTable("event_instances")
          .onDelete("CASCADE");
        table
          .integer("verified_by")
          .references("id")
          .inTable("users")
          .notNullable();
        table.string("status").notNullable();
        table.text("notes");
        table.json("verification_metadata");
        table.json("location_data");
        table.json("photo_data");
        table.timestamps(true, true);
      })

      // Event approvals table
      .createTable("event_approvals", (table) => {
        table.increments("id").primary();
        table
          .integer("instance_id")
          .references("id")
          .inTable("event_instances")
          .onDelete("CASCADE");
        table
          .integer("approver_id")
          .references("id")
          .inTable("users")
          .notNullable();
        table.integer("level").defaultTo(1);
        table.string("status").notNullable();
        table.text("notes");
        table.json("approval_metadata");
        table.timestamp("responded_at");
        table.string("ip_address");
        table.string("user_agent");
        table.timestamps(true, true);

        // Indexes
        table.index(["instance_id", "level"]);
      })

      // Event delegations table
      .createTable("event_delegations", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.integer("original_user_id").references("id").inTable("users");
        table.integer("delegated_to").references("id").inTable("users");
        table.integer("delegated_by").references("id").inTable("users");
        table.date("start_date");
        table.date("end_date");
        table.boolean("is_permanent").defaultTo(false);
        table.text("reason");
        table.string("status").defaultTo("active");
        table.json("delegation_history");
        table.timestamps(true, true);

        // Indexes
        table.index(["event_id", "original_user_id"]);
      })

      // Event templates table
      .createTable("event_templates", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.text("description");
        table.json("template_data");
        table.integer("created_by").references("id").inTable("users");
        table.boolean("is_active").defaultTo(true);
        table.json("metadata");
        table.timestamps(true, true);
      })

      // Event checklists table
      .createTable("event_checklists", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.string("title").notNullable();
        table.boolean("is_required").defaultTo(true);
        table.integer("order").defaultTo(0);
        table.json("checklist_items");
        table.timestamps(true, true);
      })

      // Event audit logs table
      .createTable("event_audit_logs", (table) => {
        table.increments("id").primary();
        table.integer("event_id").references("id").inTable("events");
        table
          .integer("instance_id")
          .references("id")
          .inTable("event_instances");
        table.integer("user_id").references("id").inTable("users");
        table.string("action").notNullable();
        table.json("details");
        table.string("ip_address");
        table.string("user_agent");
        table.timestamp("created_at").defaultTo(knex.fn.now());

        // Indexes
        table.index(["event_id", "created_at"]);
        table.index(["instance_id", "created_at"]);
      })

      // Risk assessment history table (continued)
      .createTable("event_risk_history", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.string("risk_level");
        table.integer("risk_score");
        table.json("risk_factors");
        table.integer("assessed_by").references("id").inTable("users");
        table.timestamp("assessed_at").defaultTo(knex.fn.now());
        table.text("assessment_notes");
        table.json("mitigation_updates");
        table.timestamps(true, true);

        // Indexes
        table.index(["event_id", "assessed_at"]);
      })

      // Budget tracking table
      .createTable("event_budget_tracking", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.decimal("amount", 15, 2).notNullable();
        table.string("transaction_type").notNullable(); // allocation, expense, adjustment
        table.string("category");
        table.text("description");
        table.integer("recorded_by").references("id").inTable("users");
        table.json("receipt_data");
        table.string("currency").defaultTo("USD");
        table.decimal("exchange_rate", 15, 6).defaultTo(1);
        table.timestamps(true, true);

        // Indexes
        table.index(["event_id", "created_at"]);
      })

      // Custom validation rules table
      .createTable("event_validation_rules", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.string("rule_type").notNullable();
        table.string("rule_name").notNullable();
        table.json("rule_configuration");
        table.boolean("is_active").defaultTo(true);
        table.integer("order").defaultTo(0);
        table.text("error_message");
        table.json("validation_metadata");
        table.timestamps(true, true);
      })

      // Event escalation history
      .createTable("event_escalations", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.integer("escalated_from").references("id").inTable("users");
        table.integer("escalated_to").references("id").inTable("users");
        table.string("reason");
        table.json("escalation_metadata");
        table.timestamp("resolved_at");
        table.text("resolution_notes");
        table.timestamps(true, true);

        // Indexes
        table.index(["event_id", "created_at"]);
      })

      // Integration tracking table
      .createTable("event_integrations", (table) => {
        table.increments("id").primary();
        table
          .integer("event_id")
          .references("id")
          .inTable("events")
          .onDelete("CASCADE");
        table.string("integration_type").notNullable();
        table.string("external_id");
        table.string("sync_status");
        table.timestamp("last_synced_at");
        table.json("sync_metadata");
        table.text("last_error");
        table.integer("retry_count").defaultTo(0);
        table.timestamps(true, true);

        // Indexes
        table.index(["event_id", "integration_type"]);
        table.index(["external_id"]);
      })

      // Event acceptance criteria results
      .createTable("event_acceptance_results", (table) => {
        table.increments("id").primary();
        table
          .integer("instance_id")
          .references("id")
          .inTable("event_instances")
          .onDelete("CASCADE");
        table
          .integer("criteria_id")
          .references("id")
          .inTable("event_validation_rules");
        table.boolean("passed").defaultTo(false);
        table.text("failure_reason");
        table.json("test_results");
        table.integer("verified_by").references("id").inTable("users");
        table.timestamps(true, true);

        // Indexes
        table.index(["instance_id", "criteria_id"]);
      })
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("event_acceptance_results")
    .dropTableIfExists("event_integrations")
    .dropTableIfExists("event_escalations")
    .dropTableIfExists("event_validation_rules")
    .dropTableIfExists("event_budget_tracking")
    .dropTableIfExists("event_risk_history")
    .dropTableIfExists("event_audit_logs")
    .dropTableIfExists("event_checklists")
    .dropTableIfExists("event_templates")
    .dropTableIfExists("event_delegations")
    .dropTableIfExists("event_approvals")
    .dropTableIfExists("event_verifications")
    .dropTableIfExists("event_dependencies")
    .dropTableIfExists("event_assignments")
    .dropTableIfExists("instance_ranges")
    .dropTableIfExists("event_instances")
    .dropTableIfExists("events");
};

// We'll need separate seed files for essential data
