# Review · Blank canvas and real survey publication

> Historical review of an earlier revision. Its findings and test results are not the current implementation: the working tree now includes historical calibration and a restricted synthetic-text analysis flow. See [current technical status](estat-tecnic.md).

What this change does: New campaigns start with empty descriptive fields, no questions and no synthetic insights. Groq generates the survey from the description; the app validates and saves a draft before an explicit approval allows Typeform publication.

Reviewed for the expected hackathon load: one People team and synthetic participants, using a single Node process and SQLite. This is not a production readiness approval.

## Existing defects corrected

1. New campaigns copied the turn-change survey, and the generator inserted two fixed questions regardless of the request. The initial contract is now empty, the prompt contains only the schema and rules, and reference preservation applies only to explicitly marked items from a parent survey.
2. Startup inserted demo campaigns and historical calibration; the UI repeated fixed percentages and diagnoses. Runtime seeding, the fixed chart and diagnoses were removed. Historical scenarios and canned text mappings remain only in isolated test fixtures.
3. Follow-up creation overwrote the third question with turn-change wording. It now preserves the parent questions and uses the parent title.
4. Custom single-choice questions were absent from aggregates because counting used only `dificultat_principal`. Counts now use every single-choice question’s own ID, options and text, with the existing minimum-base and complementary-category protection.
5. Publication exposed only the local platform link. The DTO and share view now expose the provider URL and a separate direct Typeform QR download. The platform QR remains available for the authorized import flow.

## Review of the final changes

No findings. Validation and approval remain server-side. API keys remain in the ignored local environment and are not returned to the browser. No dependency was added. Existing databases were preserved; the local environment now selects a fresh database containing only the new verification campaign.

Evidence: 23 passing Node tests, syntax checks and `git diff --check`; Chromium tests of login, empty draft, JSON editing, approval/publication, QR, participant branches/errors, single submission, closing/privacy, results, follow-up, search and integrations. Viewports 320, 768, 1024 and 1440 have no horizontal overflow or JavaScript errors. Inverting the new custom-choice privacy threshold causes the corresponding test to fail; the source was restored afterward.

Real connection proof: Groq `openai/gpt-oss-120b` generated four logistics-onboarding questions from the description, persisted as draft v2. After explicit approval, Typeform created https://form.typeform.com/to/k5rLOGmj. A separate read of its definition confirmed all four question texts. The direct QR was rendered and decoded with OpenCV to that same URL. Evidence and screenshots are in the ignored `test-results/` directory, including `groq-draft.json`, `live-proof.json` and `typeform-qr.svg`.

## Material limits

Free-text comments are excluded from persistence and analysis until a reviewed privacy filter exists. Removing the old canned mappings does not implement arbitrary-comment analysis. The demo’s topic/action catalog remains limited to communication, support and planning. Direct Typeform responses without a valid platform delivery bearer do not enter app aggregates. Remote production deployment, arbitrary real employee data and a new response/import round for this survey were not tested. The repository’s human review of stages 01 and 02 remains pending.

Verdict: Ship the blank-canvas survey creation and publication flow within these prototype limits.
