import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import 'antd/dist/reset.css';
import '../../src/App.css';
import Question from '../../src/components/Question';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import { questionFormats } from '../../src/data/questionFormats.js';
import {
  isAnswerComplete,
  isAnswerCorrect,
  validateQuizQuestions,
} from '../../src/utils/questionModel.js';

function NativeFixture() {
  const params = new URLSearchParams(location.search);
  const first = questionFormats.find((x) => x.id === (params.get('format') || 'drag-drop-rows'))
    .questions[0];
  const [question, setQuestion] = useState(first),
    [answer, setAnswer] = useState({}),
    [locked, setLocked] = useState(false),
    [visible, setVisible] = useState(true);
  const [dark, setDark] = useState(params.get('theme') === 'dark');
  const changes = useRef([]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    // quiz-e2e-native-drag: test-only bridge; never imported by production.
    window.quizNativeDragFixture = {
      changes: changes.current,
      question(value) {
        validateQuizQuestions([value]);
        flushSync(() => {
          setQuestion(value);
          setAnswer({});
        });
      },
      lock(value) {
        flushSync(() => setLocked(value));
      },
      visible(value) {
        flushSync(() => setVisible(value));
      },
      dark(value) {
        flushSync(() => setDark(value));
      },
    };
    return () => {
      delete window.quizNativeDragFixture;
    };
  }, []);
  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: { motion: false },
      }}
    >
      <main
        style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}
        data-native-lock={String(locked)}
      >
        {visible && (
          <Question
            data={question}
            question={question.question}
            imageUrl=""
            options={question.options}
            correctOptions={question.answer}
            selectedAnswer={answer}
            onSelectAnswer={(value) => {
              changes.current.push({ id: question.id, answer: value });
              setAnswer(value);
            }}
            readOnly={locked}
            showFeedback={locked || isAnswerComplete(question, answer)}
            isCorrect={isAnswerCorrect(question, answer)}
          />
        )}
        <output data-native-answer>{JSON.stringify(answer)}</output>
      </main>
    </ConfigProvider>
  );
}
createRoot(document.getElementById('native-fixture')).render(
  <React.StrictMode>
    <LanguageProvider>
      <NativeFixture />
    </LanguageProvider>
  </React.StrictMode>
);
