# NEURA AI Verification Notes

The Route planner was verified in the live preview on 24 August 2026. The Assam source and destination selectors loaded the backend-provided operational place registry, including Guwahati and Dibrugarh. Selecting the default corridor and running the calculation returned a live driving route with a distance of 444.2 km and a duration of 9h 15m. The third Google Maps route-recon view rendered source and destination markers together with the route polyline. The operator approval action was then executed successfully, and the interface confirmed that the resulting plan record was approved.

The Scenario lab was also verified against the live backend. With rainfall set to 120 mm and the SH-5 closure enabled, the procedure returned 57% projected network accessibility, ten affected routes, and a HIGH emergency-risk result. The interface retained the explicit “Live state unchanged” guardrail.

The Emergency desk was verified with its live Google Maps incident corridor. Selecting “Acknowledge emergency” completed the backend procedure and changed the response-control state to “Incident acknowledged.”

Route recalculation was verified by changing the destination from Dibrugarh to Silchar and calculating the corridor again. The backend returned a new live-driving result of 392.5 km and 8h 38m under a new plan identifier, confirming that input changes refresh the route record, metrics, and map output.

The refined dashboard was verified with a live Google Maps operations view, including clickable Guwahati, Tezpur, Dibrugarh, and Silchar hub markers together with an active route line and a weather-watch circle. Global search was verified to return both the Silchar operational place and the associated emergency incident.

The selected Silchar search result was verified to navigate to the Route planner and prefill the source selector as Silchar, with Cachar district displayed as a separate field and no hyphenated combined label. The rebuilt Scenario Lab was verified against the expanded backend procedure: the configured 120 mm rainfall, 35% demand increase, SH-5 closure, and V-008 unavailability returned 52% accessibility, 12 affected routes, 43% demand impact, a 26-minute replan estimate, and HIGH emergency risk. Refined Overview, Route planner, and Scenario Lab layouts were also reviewed at a 375 px mobile breakpoint.

Global search now also returns persisted route-plan records by plan key. A live lookup for “NR-” returned four stored plans, including Guwahati–Dibrugarh, Guwahati–Silchar, Jorhat–Hojai, and Tezpur–Jorhat records.

Selecting plan NR-MT7JQ7KZ from global search reloaded the Route planner with its persisted Guwahati–Dibrugarh values: 444.2 km, 9h 15m, LIVE DIRECTIONS, and APPROVED status. The plan record, decision evidence, and route map were restored successfully.

## Visible-control audit

| Workspace | Controls audited | Observed response |
|---|---|---|
| Shared shell | Sidebar modules, global search, notification control | Navigation routes to each workspace; place, incident, module, and persisted-plan search results are actionable; notification control produces the current queue summary. |
| Overview | Plan route actions, access-review action, live map markers | Route actions open the planner; access review opens Terrain grid; the Tezpur marker opened a weather-watch context card showing 42 mm / 24h. |
| Route planner | Source/destination selectors, calculate, persisted-plan search/open, approval | Assam selections calculate and persist routes; plan records are searchable and reload their metrics; approval state is retained. |
| Scenario Lab | Presets, rainfall/demand sliders, vehicle selector, closure toggle, run and reset | Controls update the scenario input state; run returns backend-calculated accessibility, affected routes, demand impact, replan estimate, and risk. Reset applies the defined Weather watch baseline. |
| Emergency | Acknowledge emergency | Records the acknowledgement through the backend and updates the response state. |
| Terrain and Provenance | Interactive map hubs; information-only lineage panel | Map hubs open context cards; Provenance intentionally has no action controls because it is a read-only evidence view. |

The final route-plan search, global notification, Overview access-review navigation, and Terrain map-hub actions were exercised in the running application. Route calculation, route approval, scenario execution, and emergency acknowledgement were exercised in the earlier live verification pass.

The Provenance workspace was inspected directly in the running application. It intentionally exposes no operator action controls: it is a read-only data-lineage and safety-disclosure view. Its only shared interactive controls are the globally audited navigation, search, and notification controls.
