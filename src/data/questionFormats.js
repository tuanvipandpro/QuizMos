export const questionFormats = [
  {
    id: 'single',
    label: 'Single choice',
    description: 'Use an array with one correct option key.',
    questions: [
      {
        id: 'q1',
        question: 'Which city is the capital of France?',
        options: { A: 'London', B: 'Paris', C: 'Berlin' },
        answer: ['B'],
      },
    ],
  },
  {
    id: 'multiple',
    label: 'Multiple choice',
    description: 'Put every correct option key in the answer array.',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Which numbers are even? Choose two.',
        options: { A: '2', B: '3', C: '4' },
        answer: ['A', 'C'],
      },
    ],
  },
  {
    id: 'yes-no',
    label: 'Yes / No',
    description: 'Give each statement a unique ID and map it to Yes or No.',
    questions: [
      {
        id: 'q1',
        type: 'yes_no',
        question: 'Evaluate each statement.',
        statements: [
          { id: 's1', text: 'Two is an even number.' },
          { id: 's2', text: 'Three is an even number.' },
        ],
        options: { A: 'Yes', B: 'No' },
        answer: { s1: 'A', s2: 'B' },
      },
    ],
  },
  {
    id: 'dropdown-rows',
    label: 'Dropdown rows',
    description: 'Each slot needs a label, its own options and a correct answer key.',
    questions: [
      {
        id: 'q1',
        type: 'dropdown',
        layout: 'rows',
        question: 'Classify each item.',
        slots: [
          { id: 'first', label: 'Keyboard' },
          { id: 'second', label: 'Monitor' },
        ],
        options: { first: { A: 'Input', B: 'Output' }, second: { A: 'Input', B: 'Output' } },
        answer: { first: 'A', second: 'B' },
      },
    ],
  },
  {
    id: 'dropdown-inline',
    label: 'Inline dropdown',
    description: 'Include each {{slotId}} exactly once in the template.',
    questions: [
      {
        id: 'q1',
        type: 'dropdown',
        layout: 'inline',
        question: 'Complete the sentence.',
        template: 'Use {{first}} for input and {{second}} for output.',
        slots: [
          { id: 'first', label: 'Input device' },
          { id: 'second', label: 'Output device' },
        ],
        options: {
          first: { A: 'Keyboard', B: 'Monitor' },
          second: { A: 'Keyboard', B: 'Monitor' },
        },
        answer: { first: 'A', second: 'B' },
      },
    ],
  },
  {
    id: 'drag-drop-rows',
    label: 'Drag and drop rows',
    description: 'Use native choices and labelled drop slots with an answer mapping.',
    questions: [
      {
        id: 'q1',
        type: 'drag_drop',
        layout: 'rows',
        question: 'Place the required access for each worker. Both workers only read files.',
        instruction: 'Drag a choice to each slot. A choice can be reused.',
        slots: [
          { id: 'first', label: 'Worker one' },
          { id: 'second', label: 'Worker two' },
        ],
        options: {
          first: { A: 'Read', B: 'Write', C: 'Admin' },
          second: { A: 'Read', B: 'Write', C: 'Admin' },
        },
        answer: { first: 'A', second: 'A' },
      },
    ],
  },
  {
    id: 'drag-drop-inline',
    label: 'Inline drag and drop',
    description: 'Place native choices in {{slotId}} blanks; GitHub code expressions stay literal.',
    questions: [
      {
        id: 'q1',
        type: 'drag_drop',
        layout: 'inline',
        question: 'Complete the workflow: log start, then finish for the current branch.',
        instruction: 'Drag a message into each blank.',
        template:
          'steps:\n  - run: echo "{{first}}"\n  - run: echo "{{second}} for ${{ github.ref }}"',
        slots: [
          { id: 'first', label: 'First message' },
          { id: 'second', label: 'Second message' },
        ],
        options: { first: { A: 'start', B: 'finish' }, second: { A: 'start', B: 'finish' } },
        answer: { first: 'A', second: 'B' },
      },
    ],
  },
];
