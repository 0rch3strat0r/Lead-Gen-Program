# Template Slots Map

## exec_brief_template.html
Required placeholders:
- `{{company_name}}`
- `{{industry}}`
- `{{company_summary}}`
- `{{pain_points}}` (HTML <li> list)
- `{{ai_opportunities}}` (HTML <li> list)
- `{{roi_estimate}}` (text or small table HTML)
- `{{call_to_action}}`

## company_vetting_template.html
Required placeholders:
- `{{company_name}}`
- `{{vetting_rows}}` (table rows; each row: Perspective | Findings | Notes)

## ai_revenue_roi_plan.html
Suggested placeholders:
- `{{baseline_costs}}`, `{{post_ai_costs}}`, `{{savings_pct}}`, `{{payback_period}}`

## ai_engagement_process_detailed.html
Suggested placeholders:
- `{{phases}}` (ordered list), `{{timeline_weeks}}`, `{{risk_controls}}`

## ai_consult_master_template.html`
Suggested placeholders:
- `{{discovery_questions}}`, `{{case_studies}}`, `{{deliverables}}`

**Rule:** Outputs should only inject placeholders above; update master templates here if you add more.
