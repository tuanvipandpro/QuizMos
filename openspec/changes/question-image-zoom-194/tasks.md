## 1. Implementation and verification

- [x] 1.1 Add the shared question image preview and integrate it into standard, structured and archived question rendering.
- [x] 1.2 Verify mouse, keyboard, touch, mobile and desktop layout, unavailable images, and Exam draft and timer preservation.

## Verification

| Requirement                                               | Local browser evidence                                                                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fit, zoom, scroll and restore focus                       | `questionImagePreview.spec.js` covers 320, 390, 412, 768 and 1280 px plus 844 px landscape. It checks EN/VN, light/dark, mouse/keyboard/touch, scroll access, and Escape at the zoom limit.                |
| Active exam state                                         | The same suite verifies the displayed timer decreases with the preview open and the saved draft remains identical, including question, answers, flag and absolute deadline, on desktop and emulated phone. |
| Structured and archived review, unavailable illustrations | The new suite covers structured Practice and a failed image. `examHistory.spec.js` verifies that a relative archived illustration can open and close while saved content and grade stay frozen.            |
