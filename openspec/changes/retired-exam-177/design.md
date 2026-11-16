# Design

Filter strictly boolean `retired: true` at new exam creation, while fingerprinting the complete source to preserve compatible drafts and history. Setup uses the eligible pool size; a zero-sized pool exposes a clear message and disables new exams. Direct routes guard the same case. Existing drafts retain their saved question order and answers. Practice continues using the complete source.

Verify selection and saved draft behavior with unit tests, and the zero and mixed pools through browser tests. Preserve translations, responsive layout, and current data contracts.
