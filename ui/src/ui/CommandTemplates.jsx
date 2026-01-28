/**
 * CommandTemplates.jsx - Milestone 3.2
 *
 * Command Template Library for saving and reusing common commands.
 * Templates are persisted to localStorage and can be quickly executed.
 */

import React, { useState, useMemo, useCallback } from "react";
import { newId } from "../utils/helpers.js";
import {
  loadCommandTemplates,
  saveCommandTemplates,
} from "../utils/persistence.js";

/**
 * Default built-in templates (cannot be deleted)
 */
const BUILTIN_TEMPLATES = [
  {
    id: "builtin-relay-on",
    name: "Relay ON",
    action: "relay.set",
    args: { relay: 1, state: 1 },
    description: "Turn relay 1 ON",
    builtin: true,
    category: "relay",
  },
  {
    id: "builtin-relay-off",
    name: "Relay OFF",
    action: "relay.set",
    args: { relay: 1, state: 0 },
    description: "Turn relay 1 OFF",
    builtin: true,
    category: "relay",
  },
  {
    id: "builtin-all-relays-off",
    name: "All Relays OFF",
    action: "relay.all_off",
    args: {},
    description: "Emergency: turn all relays OFF",
    builtin: true,
    category: "relay",
    danger: true,
  },
  {
    id: "builtin-reboot",
    name: "Reboot Device",
    action: "system.reboot",
    args: {},
    description: "Soft reboot the device",
    builtin: true,
    category: "system",
    danger: true,
  },
  {
    id: "builtin-firmware-update",
    name: "Firmware Update",
    action: "firmware.update",
    args: { url: "https://example.com/firmware.bin", version: "1.2.3" },
    description: "Update device firmware from URL",
    builtin: true,
    category: "system",
    danger: true,
  },
  {
    id: "builtin-identify",
    name: "Identify",
    action: "system.identify",
    args: { duration_ms: 5000 },
    description: "Flash LED for identification",
    builtin: true,
    category: "system",
  },
];

/**
 * Default built-in scenarios (cannot be deleted)
 */
const BUILTIN_SCENARIOS = [
  {
    id: "scenario-power-cycle",
    name: "Power Cycle Device",
    description: "Safely power cycle a device with status checks",
    builtin: true,
    category: "system",
    steps: [
      {
        action: "system.identify",
        args: { duration_ms: 2000 },
        waitMs: 0,
        description: "Identify device before power cycle",
      },
      {
        action: "relay.set",
        args: { relay: 1, state: 0 },
        waitMs: 1000,
        description: "Turn relay OFF",
      },
      {
        action: "relay.set",
        args: { relay: 1, state: 1 },
        waitMs: 2000,
        description: "Turn relay back ON",
        softAssert: "system.status",
      },
    ],
  },
  {
    id: "scenario-calibration-workflow",
    name: "Calibration Workflow",
    description: "Complete calibration workflow with dry run and apply",
    builtin: true,
    category: "calibration",
    danger: true,
    steps: [
      {
        action: "calibration.dry_run",
        args: {},
        waitMs: 0,
        description: "Test calibration changes",
      },
      {
        action: "system.identify",
        args: { duration_ms: 1000 },
        waitMs: 2000,
        description: "Brief identification before applying",
      },
      {
        action: "calibration.apply",
        args: {},
        waitMs: 1000,
        description: "Apply calibration permanently",
        softAssert: "calibration.status",
      },
    ],
  },
];

/**
 * Template categories for filtering
 */
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "relay", label: "Relay" },
  { id: "system", label: "System" },
  { id: "calibration", label: "Calibration" },
  { id: "custom", label: "Custom" },
];

/**
 * TemplateCard - A single template display
 */
function TemplateCard({
  template,
  onExecute,
  onEdit,
  onDelete,
  onDuplicate,
  disabled,
  authorityLevel,
}) {
  const canExecute =
    !disabled &&
    (authorityLevel === "armed" ||
      (authorityLevel === "control" && !template.danger));

  const canEdit = !template.builtin;
  const canDelete = !template.builtin;

  return (
    <div className={`cmdTemplateCard ${template.danger ? "danger" : ""}`}>
      <div className="cmdTemplateCardTop">
        <div className="cmdTemplateInfo">
          <span className="cmdTemplateName">{template.name}</span>
          <span className="cmdTemplateAction mono">{template.action}</span>
        </div>
        <div className="cmdTemplateCategory">{template.category || "custom"}</div>
      </div>

      {template.description && (
        <div className="cmdTemplateDesc">{template.description}</div>
      )}

      <div className="cmdTemplateArgs mono">
        {JSON.stringify(template.args || {})}
      </div>

      <div className="cmdTemplateActions">
        <button
          className={`cmdTemplateExecBtn ${template.danger ? "danger" : "secondary"}`}
          onClick={() => onExecute(template)}
          disabled={!canExecute}
          title={
            !canExecute
              ? template.danger
                ? "Requires ARMED authority"
                : "Select a device first"
              : "Execute command"
          }
        >
          {template.danger ? "⚠ Execute" : "▶ Execute"}
        </button>

        <button
          className="cmdTemplateBtn"
          onClick={() => onDuplicate(template)}
          title="Duplicate as custom template"
        >
          ⊕
        </button>

        {canEdit && (
          <button
            className="cmdTemplateBtn"
            onClick={() => onEdit(template)}
            title="Edit template"
          >
            ✎
          </button>
        )}

        {canDelete && (
          <button
            className="cmdTemplateBtn danger"
            onClick={() => onDelete(template.id)}
            title="Delete template"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ScenarioCard - A single scenario display
 */
function ScenarioCard({
  scenario,
  onExecute,
  disabled,
  authorityLevel,
  isExecuting,
  currentStep,
}) {
  const canExecute =
    !disabled &&
    (authorityLevel === "armed" ||
      (authorityLevel === "control" && !scenario.danger));

  return (
    <div className={`cmdTemplateCard ${scenario.danger ? "danger" : ""} ${isExecuting ? "executing" : ""}`}>
      <div className="cmdTemplateHeader">
        <div className="cmdTemplateName">{scenario.name}</div>
        <div className="cmdTemplateCategory">{scenario.category}</div>
      </div>

      <div className="cmdTemplateDescription">
        {scenario.description}
      </div>

      <div className="scenarioSteps">
        <div className="scenarioStepsHeader">
          Steps ({scenario.steps.length})
        </div>
        <div className="scenarioStepsList">
          {scenario.steps.map((step, index) => (
            <div
              key={index}
              className={`scenarioStep ${isExecuting && index === currentStep ? "current" : ""} ${isExecuting && index < currentStep ? "completed" : ""}`}
            >
              <span className="scenarioStepNumber">{index + 1}</span>
              <span className="scenarioStepAction">{step.action}</span>
              {step.waitMs > 0 && (
                <span className="scenarioStepWait">({step.waitMs}ms)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cmdTemplateActions">
        <button
          className={`cmdTemplateExecute ${canExecute ? "" : "disabled"}`}
          onClick={() => canExecute && onExecute(scenario)}
          disabled={!canExecute || isExecuting}
          title={
            !canExecute
              ? authorityLevel === "view"
                ? "View-only mode"
                : "Dangerous scenario requires ARMED mode"
              : isExecuting
              ? "Scenario executing..."
              : "Execute scenario"
          }
        >
          {isExecuting ? `Executing (${currentStep + 1}/${scenario.steps.length})` : scenario.danger ? "⚠ Execute" : "▶ Execute"}
        </button>
      </div>
    </div>
  );
}

/**
 * TemplateEditor - Modal for creating/editing templates
 */
function TemplateEditor({ template, onSave, onCancel }) {
  const [name, setName] = useState(template?.name || "");
  const [action, setAction] = useState(template?.action || "");
  const [argsText, setArgsText] = useState(
    template?.args ? JSON.stringify(template.args, null, 2) : "{}"
  );
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "custom");
  const [isDanger, setIsDanger] = useState(template?.danger || false);
  const [error, setError] = useState(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!action.trim()) {
      setError("Action is required");
      return;
    }

    let parsedArgs;
    try {
      parsedArgs = JSON.parse(argsText);
    } catch (e) {
      setError("Invalid JSON in args: " + e.message);
      return;
    }

    onSave({
      id: template?.id || newId(),
      name: name.trim(),
      action: action.trim(),
      args: parsedArgs,
      description: description.trim(),
      category,
      danger: isDanger,
      builtin: false,
    });
  };

  return (
    <div className="cmdTemplateEditor">
      <div className="cmdTemplateEditorHeader">
        <h3>{template ? "Edit Template" : "New Template"}</h3>
        <button className="cmdTemplateEditorClose" onClick={onCancel}>
          ✕
        </button>
      </div>

      {error && <div className="cmdTemplateEditorError">{error}</div>}

      <div className="cmdTemplateEditorForm">
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Command"
          />
        </label>

        <label>
          Action
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="relay.set"
            className="mono"
          />
        </label>

        <label>
          Arguments (JSON)
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            rows={4}
            className="mono"
            spellCheck={false}
          />
        </label>

        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this command does..."
          />
        </label>

        <div className="cmdTemplateEditorRow">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="relay">Relay</option>
              <option value="system">System</option>
              <option value="calibration">Calibration</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="cmdTemplateEditorCheckbox">
            <input
              type="checkbox"
              checked={isDanger}
              onChange={(e) => setIsDanger(e.target.checked)}
            />
            Dangerous (requires ARMED)
          </label>
        </div>
      </div>

      <div className="cmdTemplateEditorActions">
        <button onClick={onCancel}>Cancel</button>
        <button className="secondary" onClick={handleSave}>
          Save Template
        </button>
      </div>
    </div>
  );
}

/**
 * CommandTemplates - Main component
 *
 * @param {Object} props
 * @param {Function} props.onExecuteTemplate - Called when user executes a template
 * @param {string} props.selectedDevice - Currently selected device
 * @param {string} props.authorityLevel - Current authority level (view/control/armed)
 * @param {boolean} props.collapsed - Whether panel is collapsed
 * @param {Function} props.onToggleCollapse - Toggle collapse state
 */
export default function CommandTemplates({
  onExecuteTemplate,
  selectedDevice,
  authorityLevel = "control",
  collapsed = false,
  onToggleCollapse,
}) {
  const [customTemplates, setCustomTemplates] = useState(() =>
    loadCommandTemplates()
  );
  const [customScenarios, setCustomScenarios] = useState(() =>
    JSON.parse(localStorage.getItem('pulsar-command-scenarios') || '[]')
  );
  const [activeTab, setActiveTab] = useState("templates");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingScenario, setEditingScenario] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [executingScenario, setExecutingScenario] = useState(null);
  const [executionStep, setExecutionStep] = useState(0);

  // Merge builtin and custom templates
  const allTemplates = useMemo(() => {
    return [...BUILTIN_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      // Category filter
      if (categoryFilter !== "all" && t.category !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.action.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allTemplates, categoryFilter, searchQuery]);

  // Save custom templates to localStorage
  const persistTemplates = useCallback((templates) => {
    setCustomTemplates(templates);
    saveCommandTemplates(templates);
  }, []);

  const handleExecute = useCallback(
    (template) => {
      if (onExecuteTemplate && selectedDevice) {
        onExecuteTemplate(selectedDevice, template.action, template.args, template.danger);
      }
    },
    [onExecuteTemplate, selectedDevice]
  );

  const handleEdit = useCallback((template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  }, []);

  const handleDelete = useCallback(
    (templateId) => {
      if (window.confirm("Delete this template?")) {
        persistTemplates(customTemplates.filter((t) => t.id !== templateId));
      }
    },
    [customTemplates, persistTemplates]
  );

  // Scenario persistence
  const persistScenarios = useCallback((scenarios) => {
    setCustomScenarios(scenarios);
    localStorage.setItem('pulsar-command-scenarios', JSON.stringify(scenarios));
  }, []);

  // Merge builtin and custom scenarios
  const allScenarios = useMemo(() => {
    return [...BUILTIN_SCENARIOS, ...customScenarios];
  }, [customScenarios]);

  // Scenario execution
  const handleExecuteScenario = useCallback(
    async (scenario) => {
      if (!selectedDevice || !onExecuteTemplate) return;

      setExecutingScenario(scenario);
      setExecutionStep(0);

      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        setExecutionStep(i);

        // Execute the step
        onExecuteTemplate(selectedDevice, step.action, step.args, scenario.danger);

        // Wait for the specified time
        if (step.waitMs > 0) {
          await new Promise(resolve => setTimeout(resolve, step.waitMs));
        }

        // Optional soft assertion (could be enhanced to check device state)
        if (step.softAssert) {
          // For now, just log the assertion
          console.log(`Scenario ${scenario.name}: Step ${i + 1} completed, asserting ${step.softAssert}`);
        }
      }

      setExecutingScenario(null);
      setExecutionStep(0);
    },
    [selectedDevice, onExecuteTemplate]
  );

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    return allScenarios.filter((s) => {
      // Category filter
      if (categoryFilter !== "all" && s.category !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.steps.some(step => step.action.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allScenarios, categoryFilter, searchQuery]);

  const handleDuplicate = useCallback(
    (template) => {
      const newTemplate = {
        ...template,
        id: newId(),
        name: template.name + " (copy)",
        builtin: false,
        category: "custom",
      };
      setEditingTemplate(newTemplate);
      setShowEditor(true);
    },
    []
  );

  const handleSaveTemplate = useCallback(
    (template) => {
      const existing = customTemplates.findIndex((t) => t.id === template.id);
      if (existing >= 0) {
        const updated = [...customTemplates];
        updated[existing] = template;
        persistTemplates(updated);
      } else {
        persistTemplates([...customTemplates, template]);
      }
      setShowEditor(false);
      setEditingTemplate(null);
    },
    [customTemplates, persistTemplates]
  );

  const handleCancelEdit = useCallback(() => {
    setShowEditor(false);
    setEditingTemplate(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    setEditingTemplate(null);
    setShowEditor(true);
  }, []);

  return (
    <div className={`commandTemplates ${collapsed ? "collapsed" : ""}`}>
      <div className="cmdTemplatesHeader">
        <div className="cmdTemplatesHeaderLeft">
          {onToggleCollapse && (
            <button className="cmdTemplatesCollapseBtn" onClick={onToggleCollapse}>
              {collapsed ? "▶" : "▼"}
            </button>
          )}
          <h2 className="cmdTemplatesTitle">Command Library</h2>
        </div>
        <div className="cmdTemplatesTabs">
          <button
            className={`cmdTemplatesTab ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => setActiveTab("templates")}
          >
            Templates
          </button>
          <button
            className={`cmdTemplatesTab ${activeTab === "scenarios" ? "active" : ""}`}
            onClick={() => setActiveTab("scenarios")}
          >
            Scenarios
          </button>
        </div>
        <button
          className="cmdTemplatesNewBtn secondary"
          onClick={handleCreateNew}
        >
          + New
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Search and filters */}
          <div className="cmdTemplatesControls">
            <input
              className="cmdTemplatesSearch"
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="cmdTemplatesCategoryFilters">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`cmdTemplatesCategoryBtn ${
                    categoryFilter === cat.id ? "active" : ""
                  }`}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device indicator */}
          {!selectedDevice && (
            <div className="cmdTemplatesNoDevice">
              Select a device to execute {activeTab}
            </div>
          )}

          {/* Content grid */}
          <div className="cmdTemplatesGrid">
            {activeTab === "templates" ? (
              // Templates
              filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onExecute={handleExecute}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    disabled={!selectedDevice}
                    authorityLevel={authorityLevel}
                  />
                ))
              ) : (
                <div className="cmdTemplatesEmpty">
                  {searchQuery
                    ? "No templates match your search"
                    : "No templates in this category"}
                </div>
              )
            ) : (
              // Scenarios
              filteredScenarios.length > 0 ? (
                filteredScenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onExecute={handleExecuteScenario}
                    disabled={!selectedDevice}
                    authorityLevel={authorityLevel}
                    isExecuting={executingScenario?.id === scenario.id}
                    currentStep={executionStep}
                  />
                ))
              ) : (
                <div className="cmdTemplatesEmpty">
                  {searchQuery
                    ? "No scenarios match your search"
                    : "No scenarios in this category"}
                </div>
              )
            )}
          </div>

          {/* Editor modal */}
          {showEditor && (
            <div className="cmdTemplateEditorOverlay">
              <TemplateEditor
                template={editingTemplate}
                onSave={handleSaveTemplate}
                onCancel={handleCancelEdit}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
