# Design

Share one question image component between standard questions, structured questions and archived review. Keep the archive's existing URL resolution and unavailable-image message.

Use the existing modal for focus containment and Escape handling. A native button opens the preview. The image initially fits the available width and height at its original aspect ratio. Labelled zoom controls enlarge it within a keyboard-focusable area with native touch and keyboard scrolling.

Store the open state and zoom level inside the image component. Start each opening at fit size, restore focus to the image trigger on close, and remove the preview when the question changes. The Exam keeps its existing deadline calculation while the modal is open.
